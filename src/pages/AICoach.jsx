import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, Sparkles, Plus, MessageSquare, Trash2, Menu, X, Search, Dumbbell, CalendarDays, Target, Play, Share2, BookOpen, Pencil } from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { searchHybridMemory, maybeStoreConversation } from '../services/memory';
import { chatWithBenfit, generateConversationTitle, generateEmbedding } from '../services/ai';
import { buildUserContext } from '../services/context';
import { useUserRole } from '../hooks/useSupabase';
import './AICoach.css';

// ── Constantes ───────────────────────────────────────────────────
const SUGGESTIONS = [
    "Como foi meu último treino?",
    "Posso aumentar a carga?",
    "Como melhorar minha recuperação?",
    "Dicas de isometria",
];

const QUICK_ACTIONS = [
    { id: 'historico',  icon: CalendarDays, label: 'Histórico',     type: 'navigate',      path: '/historico' },
    { id: 'treinar',    icon: Play,         label: 'Treinar agora',  type: 'navigate',      path: '/meu-treino' },
    { id: 'metas',      icon: Target,       label: 'Minhas metas',   type: 'local',         query: 'Minhas metas ativas' },
    { id: 'exercicios', icon: Dumbbell,     label: 'Exercícios',     type: 'muscle_picker'  },
];

const MUSCLE_GROUPS = [
    { name: 'Tríceps',      keywords: ['tríceps', 'triceps', 'trícep', 'tricep'] },
    { name: 'Bíceps',       keywords: ['bíceps', 'biceps', 'bícep', 'bicep'] },
    { name: 'Peitoral',     keywords: ['peitoral', 'peito', 'pectorais'] },
    { name: 'Costas',       keywords: ['costas', 'dorsal', 'latíssimo', 'latissimo', 'remada'] },
    { name: 'Ombros',       keywords: ['ombros', 'ombro', 'deltoides', 'deltoide'] },
    { name: 'Pernas',       keywords: ['pernas', 'perna', 'quadríceps', 'quadriceps', 'isquiotibiais', 'coxa'] },
    { name: 'Abdômen',      keywords: ['abdômen', 'abdomen', 'abdominal', 'abdominais', 'core'] },
    { name: 'Glúteos',      keywords: ['glúteos', 'gluteos', 'glúteo', 'gluteo'] },
    { name: 'Panturrilha',  keywords: ['panturrilha', 'panturrilhas', 'sóleo', 'soleo'] },
];

const INITIAL_MESSAGE = {
    id: 'initial',
    sender: 'ai',
    text: 'Olá! Sou o **Benfit Coach** 🏋️\n\nTenho acesso ao seu histórico completo de treinos e metas. Pergunte qualquer coisa — sobre sua evolução, cargas, recuperação ou planejamento!'
};

// ── Helpers de contexto local (evita chamadas ao Gemini) ─────────
const extractSection = (context, header) => {
    const marker = `## ${header}`;
    const idx = context.indexOf(marker);
    if (idx === -1) return null;
    const after = context.slice(idx + marker.length).trim();
    const nextIdx = after.indexOf('\n## ');
    return (nextIdx !== -1 ? after.slice(0, nextIdx) : after).trim() || null;
};

// Formata resultados do shared knowledge como resposta direta ao usuário
const DIRECT_SIMILARITY_THRESHOLD = 0.40;

const formatSharedKnowledgeResponse = (results) => {
    if (!results || results.length === 0) return null;
    const exercises = results.filter(r => r.knowledge_type === 'exercise');
    const other = results.filter(r => r.knowledge_type !== 'exercise');
    const parts = [];

    if (exercises.length === 1) {
        const ex = exercises[0];
        const m = ex.metadata || {};
        parts.push(`**${m.name || 'Exercício'}**`);
        if (m.muscle_group) parts.push(`Grupo muscular: **${m.muscle_group}**`);
        if (m.equipment) parts.push(`Equipamento: ${m.equipment}`);
        const execMatch = ex.content.match(/[Ee]xecu[çc][ãa]o:\s*(.+?)(?:\.\s*[Tt]ags:|$)/s);
        if (execMatch) {
            const steps = execMatch[1].trim().split(/\.\s+/).filter(s => s.length > 3);
            if (steps.length > 1) {
                parts.push(`\n**Como executar:**`);
                steps.forEach(s => parts.push(`* ${s.trim()}`));
            } else {
                parts.push(`\n**Execução:** ${execMatch[1].trim()}`);
            }
        }
        if (Array.isArray(m.tags) && m.tags.length > 0) {
            parts.push(`\n_Tags: ${m.tags.join(', ')}_`);
        }
    } else if (exercises.length > 1) {
        parts.push(`**${exercises.length} exercício(s) encontrado(s):**\n`);
        exercises.forEach(ex => {
            const m = ex.metadata || {};
            const name = m.name || 'Exercício';
            const muscle = m.muscle_group ? ` — ${m.muscle_group}` : '';
            const equip = m.equipment ? ` (${m.equipment})` : '';
            parts.push(`* **${name}**${muscle}${equip}`);
        });
        parts.push(`\n_Quer detalhes sobre algum deles? Me pergunte!_`);
    }

    other.forEach(item => {
        if (parts.length > 0) parts.push('');
        parts.push(item.content);
    });

    return parts.length > 0 ? parts.join('\n') : null;
};

// Tenta responder localmente sem consumir tokens do Gemini
// Apenas para fatos simples de perfil/metas — exercícios vão para Gemini + shared knowledge
const tryLocalResponse = (text, context) => {
    if (!context || context.includes('Nenhum dado estruturado')) return null;
    const lower = text.toLowerCase();

    // Metas (apenas consultas diretas, não perguntas sobre estratégia)
    if (/\b(meta|metas|objetivo|objetivos)\b/.test(lower) && !/\b(como|alcançar|atingir|melhorar)\b/.test(lower)) {
        const content = extractSection(context, 'Metas Ativas');
        if (content) return `**Suas metas ativas:**\n\n${content}\n\n_Quer estratégias para alcançar alguma delas? Me pergunte!_`;
        return 'Você ainda não tem metas cadastradas no app. Que tal definir uma agora?';
    }

    // Perfil
    if (/\b(meu perfil|meu peso|minha altura|minha idade|meus dados)\b/.test(lower)) {
        const content = extractSection(context, 'Perfil do Aluno');
        if (content) return `**Seu perfil:**\n\n${content}`;
    }

    return null; // Vai para o Gemini + busca semântica
};

// Detecta perguntas que devem buscar no catálogo de exercícios compartilhado
const SHARED_KNOWLEDGE_PATTERNS = [
    /exerc[ií]cio/i,
    /treino|treinar/i,
    /músculo|musculo|muscular/i,
    /b[íi]ceps|tr[íi]ceps|peitoral|costas|ombro|perna|gl[úu]teo|abdômen|panturrilha/i,
    /como (fazer|executar|realizar|fortalecer|melhorar)/i,
    /técnica|execução|movimento/i,
    /equipamento|barra|haltere|máquina/i,
    /para que serve/i,
    /diferença entre/i,
    /dica[s]?/i,
    /série[s]?|repeti[çc][ãa]o/i,
];
const isSharedKnowledgeQuery = (text) =>
    SHARED_KNOWLEDGE_PATTERNS.some(p => p.test(text));

// Formata data relativa para o sidebar
const formatRelativeDate = (dateStr) => {
    const date = new Date(dateStr);
    const diffDays = Math.floor((new Date() - date) / 86400000);
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// ── Componente ───────────────────────────────────────────────────
const AICoach = () => {
    const navigate = useNavigate();
    const { role } = useUserRole();
    const canShare = role === 'admin' || role === 'personal';

    const [messages, setMessages] = useState([INITIAL_MESSAGE]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Conversas
    const [conversations, setConversations] = useState([]);
    const [currentConvId, setCurrentConvId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isFirstMessage, setIsFirstMessage] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingConvId, setEditingConvId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');

    // Quick actions
    const [showMusclePicker, setShowMusclePicker] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);

    const [userId, setUserId] = useState(null);
    const [structuredContext, setStructuredContext] = useState('');

    const messagesEndRef = useRef(null);
    const messagesAreaRef = useRef(null);
    const userIdRef = useRef(null);
    const currentConvIdRef = useRef(null);
    const textareaRef = useRef(null);
    const lastScrollRef = useRef(0);

    // ── Init ─────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                setUserId(user.id);
                userIdRef.current = user.id;

                const [convs, userCtx] = await Promise.allSettled([
                    supabaseHelpers.getConversations(user.id),
                    buildUserContext(user.id)
                ]);

                if (convs.status === 'fulfilled' && convs.value?.length > 0) {
                    setConversations(convs.value);
                    // Não carrega a última conversa automaticamente — usuário escolhe pelo sidebar
                }

                if (userCtx.status === 'fulfilled' && userCtx.value) {
                    setStructuredContext(userCtx.value);
                }
            } catch (err) {
                console.error('[Benfit Coach] Erro crítico no init:', err);
            }
        };
        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Scroll interno → layout ───────────────────────────────────
    useEffect(() => {
        const area = messagesAreaRef.current;
        if (!area) return;
        const onScroll = () => {
            const scrollTop = area.scrollTop;
            const direction = scrollTop > lastScrollRef.current ? 'down' : 'up';
            lastScrollRef.current = scrollTop;
            window.dispatchEvent(new CustomEvent('app-inner-scroll', { detail: { scrollTop, direction } }));
        };
        area.addEventListener('scroll', onScroll, { passive: true });
        return () => { area.removeEventListener('scroll', onScroll); };
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

    // ── Fechar sidebar: overlay click ─────────────────────────────
    useEffect(() => {
        if (!sidebarOpen) return;
        const handler = (e) => {
            if (e.target.classList.contains('sidebar-overlay')) setSidebarOpen(false);
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [sidebarOpen]);

    // ── Fechar sidebar: tecla ESC ─────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [sidebarOpen]);

    // ── Fechar sidebar: botão Voltar do browser ───────────────────
    useEffect(() => {
        if (sidebarOpen) {
            // Empurra um estado dummy no histórico para interceptar o "voltar"
            window.history.pushState({ benfitSidebar: true }, '');
        }
    }, [sidebarOpen]);

    useEffect(() => {
        const handler = () => {
            if (sidebarOpen) setSidebarOpen(false);
        };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, [sidebarOpen]);

    const filteredConversations = searchQuery.trim()
        ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : conversations;

    // ── Carrega mensagens de uma conversa ─────────────────────────
    const loadConversation = async (convId) => {
        setLoadingMessages(true);
        setCurrentConvId(convId);
        currentConvIdRef.current = convId;
        setSidebarOpen(false);
        setSearchQuery('');
        try {
            const msgs = await supabaseHelpers.getConversationMessages(convId);
            if (msgs?.length > 0) {
                setMessages([INITIAL_MESSAGE, ...msgs.map(m => ({
                    id: m.id, sender: m.role === 'user' ? 'user' : 'ai', text: m.content
                }))]);
                setIsFirstMessage(false);
            } else {
                setMessages([INITIAL_MESSAGE]);
                setIsFirstMessage(true);
            }
        } catch {
            setMessages([INITIAL_MESSAGE]);
        } finally {
            setLoadingMessages(false);
        }
    };

    // ── Nova conversa ─────────────────────────────────────────────
    const handleNewConversation = async () => {
        const uid = userIdRef.current || userId;
        if (!uid) return;
        try {
            const newConv = await supabaseHelpers.createConversation(uid, 'Nova conversa');
            setConversations(prev => [newConv, ...prev]);
            setCurrentConvId(newConv.id);
            currentConvIdRef.current = newConv.id;
            setMessages([INITIAL_MESSAGE]);
            setIsFirstMessage(true);
            setSidebarOpen(false);
            setSearchQuery('');
        } catch (err) {
            console.error('[Benfit Coach] Erro ao criar conversa:', err);
        }
    };

    // ── Deleta conversa ───────────────────────────────────────────
    const handleDeleteConversation = async (e, convId) => {
        e.stopPropagation();
        if (!confirm('Excluir esta conversa?')) return;
        try {
            await supabaseHelpers.deleteConversation(convId);
            const updated = conversations.filter(c => c.id !== convId);
            setConversations(updated);
            if (currentConvId === convId) {
                if (updated.length > 0) await loadConversation(updated[0].id);
                else {
                    setCurrentConvId(null);
                    currentConvIdRef.current = null;
                    setMessages([INITIAL_MESSAGE]);
                    setIsFirstMessage(true);
                }
            }
        } catch (err) {
            console.error('[Benfit Coach] Erro ao excluir conversa:', err);
        }
    };

    // ── Edita título da conversa ──────────────────────────────────
    const handleStartEdit = (e, conv) => {
        e.stopPropagation();
        setEditingConvId(conv.id);
        setEditingTitle(conv.title);
    };

    const handleSaveEdit = async (convId) => {
        const title = editingTitle.trim();
        const original = conversations.find(c => c.id === convId)?.title;
        setEditingConvId(null);
        if (title && title !== original) {
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c));
            supabaseHelpers.updateConversationTitle(convId, title).catch(() => {});
        }
    };

    // ── Quick actions ─────────────────────────────────────────────
    const handleQuickAction = async (action) => {
        if (action.type === 'navigate') {
            navigate(action.path);
            return;
        }
        if (action.type === 'muscle_picker') {
            setShowMusclePicker(prev => !prev);
            return;
        }
        if (action.type === 'local') {
            await sendMessage(action.query);
        }
    };

    const handleMuscleSelect = async (muscle) => {
        setShowMusclePicker(false);
        await sendMessage(`Exercícios de ${muscle.name}`);
    };

    // ── Compartilha resposta na base de conhecimento ──────────────
    const handleShareToKnowledge = async (msg) => {
        const [sharingId] = [msg.id];
        try {
            const embedding = await generateEmbedding(msg.text);
            const { error } = await supabase.from('b_shared_knowledge').insert({
                knowledge_type: 'fitness_tip',
                content: msg.text.slice(0, 2000),
                metadata: {
                    shared_by: role,
                    shared_at: new Date().toISOString(),
                    source: 'coach_chat',
                },
                embedding,
            });
            if (error) throw error;
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Resposta compartilhada com todos os alunos!', type: 'success' }
            }));
            // Marca mensagem como compartilhada
            setMessages(prev => prev.map(m =>
                m.id === sharingId ? { ...m, shared: true } : m
            ));
        } catch (e) {
            console.error('[Share] Falha ao compartilhar:', e?.message);
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Erro ao compartilhar. Tente novamente.', type: 'error' }
            }));
        }
    };

    // ── Envia mensagem (core, reutilizável) ───────────────────────
    const sendMessage = async (text) => {
        if (!text?.trim() || isTyping) return;
        text = text.trim();

        const uid = userIdRef.current || userId;
        let convId = currentConvIdRef.current || currentConvId;

        // Cria conversa automaticamente se necessário
        if (!convId && uid) {
            try {
                const newConv = await supabaseHelpers.createConversation(uid, 'Nova conversa');
                setConversations(prev => [newConv, ...prev]);
                setCurrentConvId(newConv.id);
                currentConvIdRef.current = newConv.id;
                convId = newConv.id;
            } catch (err) {
                console.error('[Benfit Coach] Erro ao criar conversa automática:', err);
            }
        }

        const userMsg = { id: Date.now(), sender: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        const wasFirst = isFirstMessage;
        if (wasFirst) setIsFirstMessage(false);

        try {
            if (uid) {
                supabaseHelpers.saveChatMessage(uid, 'user', text, convId).catch(() => {});
                if (convId) supabaseHelpers.touchConversation(convId).catch(() => {});
            }

            // ── Nível 1: Resposta local (metas/perfil, sem rede) ──
            const localAnswer = tryLocalResponse(text, structuredContext);

            let responseText;
            let directAnswer = null;

            if (localAnswer) {
                responseText = localAnswer;
                console.log('[Benfit Coach] Respondido localmente (sem Gemini).');
            } else {
                // ── Nível 2: Busca no shared knowledge + memórias ─
                let userMemories = [];
                let sharedResults = [];
                if (uid) {
                    const result = await searchHybridMemory(
                        uid, text, 0.25, 10,
                        isSharedKnowledgeQuery(text) ? ['exercise', 'workout_template', 'fitness_tip', 'faq'] : null
                    );
                    userMemories = result.userMemories;
                    sharedResults = result.sharedResults;
                }

                // Resultados com similaridade suficiente → resposta direta, sem Gemini
                const directResults = sharedResults.filter(r => r.similarity >= DIRECT_SIMILARITY_THRESHOLD);
                directAnswer = directResults.length > 0
                    ? formatSharedKnowledgeResponse(directResults)
                    : null;

                if (directAnswer) {
                    responseText = directAnswer;
                    console.log(`[Benfit Coach] Respondido via shared knowledge (${directResults.length} resultado(s), sem Gemini).`);
                } else {
                    // ── Nível 3: Gemini com contexto de memórias ──
                    let contextText = '';
                    if (userMemories.length > 0) {
                        contextText = userMemories.map((m, i) => {
                            const dateStr = m.metadata?.date ? new Date(m.metadata.date).toLocaleDateString('pt-BR') : '';
                            const typeLabel = m.metadata?.type === 'workout' ? '🏋️ Treino'
                                : m.metadata?.type === 'goal' ? '🎯 Meta'
                                : m.metadata?.type === 'conversation' ? '💬 Conversa anterior'
                                : '📌 Registro';
                            return `[${i + 1}] ${typeLabel} ${dateStr}: ${m.content}`;
                        }).join('\n');
                    }
                    // Resultados fracos (<0.40) ainda entram como contexto para o Gemini
                    const weakSharedText = sharedResults.length > 0
                        ? sharedResults.map((r, i) => `[${i + 1}] 📚 ${r.content}`).join('\n')
                        : '';

                    const instructions = `Você é o Benfit Coach. Use os dados do aluno e o contexto abaixo para responder de forma direta e motivadora. Se não souber, peça mais informações.`;

                    const fullContext = [
                        instructions,
                        structuredContext ? `### DADOS DO ALUNO:\n${structuredContext}` : '',
                        weakSharedText ? `\n## CATÁLOGO BENFIT:\n${weakSharedText}` : '',
                        contextText ? `\n## MEMÓRIAS:\n${contextText}` : '',
                    ].filter(Boolean).join('\n\n---\n\n');

                    responseText = await chatWithBenfit(text, fullContext);
                }
            }

            const aiMsg = { id: Date.now() + 1, sender: 'ai', text: responseText };
            setMessages(prev => [...prev, aiMsg]);

            if (uid) {
                supabaseHelpers.saveChatMessage(uid, 'assistant', responseText, convId).catch(() => {});
                // Só armazena conversas ricas que passaram pelo Gemini
                if (!localAnswer && !directAnswer) {
                    maybeStoreConversation(uid, text, responseText).catch(() => {});
                }
            }

            // Título imediato (palavras-chave da mensagem) + refinamento via Gemini
            if (wasFirst && convId && uid) {
                const quickTitle = text
                    .split(' ')
                    .filter(w => w.length > 2)
                    .slice(0, 5)
                    .join(' ')
                    .trim() || text.slice(0, 30);
                setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: quickTitle } : c));
                supabaseHelpers.updateConversationTitle(convId, quickTitle).catch(() => {});

                generateConversationTitle(text).then(title => {
                    supabaseHelpers.updateConversationTitle(convId, title).catch(() => {});
                    setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c));
                }).catch(() => {});
            }

            // Reordena lista de conversas
            if (convId) {
                setConversations(prev => {
                    const conv = prev.find(c => c.id === convId);
                    if (!conv) return prev;
                    return [{ ...conv, last_message_at: new Date().toISOString() }, ...prev.filter(c => c.id !== convId)];
                });
            }

        } catch (error) {
            console.error('[Benfit Coach] Erro:', error);
            setMessages(prev => [...prev, {
                id: Date.now() + 2, sender: 'ai',
                text: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = inputValue.trim();
        if (!text) return;
        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        await sendMessage(text);
    };

    const handleSuggestion = (suggText) => {
        setInputValue(suggText);
        textareaRef.current?.focus();
    };

    const handleTextareaChange = (e) => {
        setInputValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputValue.trim() && !isTyping && !loadingMessages) handleSendMessage(e);
        }
    };

    const renderText = (text) => {
        return text.split('\n').map((line, i) => {
            const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('• ');
            const content = isBullet ? line.trim().substring(2) : line;
            return (
                <div key={i} style={{ marginBottom: isBullet ? '0.15rem' : '0.4rem', display: 'flex', alignItems: 'flex-start' }}>
                    {isBullet && <span style={{ marginRight: '0.4rem', color: 'var(--color-primary)', flexShrink: 0 }}>•</span>}
                    <span>
                        {content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                            part.startsWith('**') && part.endsWith('**')
                                ? <strong key={j}>{part.slice(2, -2)}</strong>
                                : part
                        )}
                    </span>
                </div>
            );
        });
    };

    const currentConvTitle = conversations.find(c => c.id === currentConvId)?.title || 'Benfit Coach';

    return (
        <div className="page-container">

            {/* ── Header bar ── */}
            <div className="coach-header">
                <button
                    className="coach-header-btn"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Histórico de conversas"
                    data-tooltip="Histórico"
                >
                    <Menu size={18} />
                </button>
                <span className="coach-header-title">{currentConvTitle}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {canShare && (
                        <button
                            className="coach-header-btn"
                            onClick={() => navigate('/conhecimento')}
                            aria-label="Base de Conhecimento"
                            data-tooltip="Base de Conhecimento"
                        >
                            <BookOpen size={18} />
                        </button>
                    )}
                    <button
                        className="coach-header-btn"
                        onClick={handleNewConversation}
                        aria-label="Nova conversa"
                        data-tooltip="Nova conversa"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* ── Overlay ── */}
            {sidebarOpen && <div className="sidebar-overlay" />}

            {/* ── Sidebar drawer ── */}
            <aside className={`conversations-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <span className="sidebar-title">Conversas</span>
                    <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Fechar">
                        <X size={18} />
                    </button>
                </div>

                <div className="sidebar-search-wrapper">
                    <Search size={14} className="sidebar-search-icon" />
                    <input
                        className="sidebar-search-input"
                        type="text"
                        placeholder="Buscar conversa..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="sidebar-search-clear" onClick={() => setSearchQuery('')}>
                            <X size={12} />
                        </button>
                    )}
                </div>

                <div className="sidebar-list">
                    {filteredConversations.length === 0 ? (
                        <p className="sidebar-empty">
                            {searchQuery ? 'Nenhum resultado' : 'Nenhuma conversa ainda'}
                        </p>
                    ) : (
                        filteredConversations.map(conv => (
                            <div
                                key={conv.id}
                                className={`sidebar-item ${conv.id === currentConvId ? 'active' : ''}`}
                                onClick={() => editingConvId !== conv.id && loadConversation(conv.id)}
                            >
                                <MessageSquare size={14} className="sidebar-item-icon" />
                                <div className="sidebar-item-info">
                                    {editingConvId === conv.id ? (
                                        <input
                                            className="sidebar-item-edit-input"
                                            value={editingTitle}
                                            onChange={e => setEditingTitle(e.target.value)}
                                            onBlur={() => handleSaveEdit(conv.id)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(conv.id); }
                                                if (e.key === 'Escape') setEditingConvId(null);
                                            }}
                                            onClick={e => e.stopPropagation()}
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="sidebar-item-title">{conv.title}</span>
                                    )}
                                    <span className="sidebar-item-date">{formatRelativeDate(conv.last_message_at)}</span>
                                </div>
                                <button
                                    className="sidebar-edit-btn"
                                    onClick={(e) => handleStartEdit(e, conv)}
                                    aria-label="Renomear conversa"
                                    data-tooltip="Renomear"
                                >
                                    <Pencil size={12} />
                                </button>
                                <button
                                    className="sidebar-delete-btn"
                                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                                    aria-label="Excluir conversa"
                                    data-tooltip="Excluir"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* ── Mensagens ── */}
            <div className="messages-area" ref={messagesAreaRef}>
                {loadingMessages ? (
                    <div className="messages-loading">Carregando conversa...</div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.sender}`}>
                            <div className="message-avatar">
                                {msg.sender === 'ai' ? <Bot size={18} /> : <User size={18} />}
                            </div>
                            <div className="message-bubble">
                                {renderText(msg.text)}
                                {canShare && msg.sender === 'ai' && msg.id !== 'initial' && (
                                    <button
                                        className={`share-to-kb-btn ${msg.shared ? 'shared' : ''}`}
                                        onClick={() => handleShareToKnowledge(msg)}
                                        disabled={msg.shared}
                                        data-tooltip={msg.shared ? 'Já compartilhado' : 'Compartilhar com todos'}
                                        aria-label="Salvar como conhecimento compartilhado"
                                    >
                                        <Share2 size={11} />
                                        <span>{msg.shared ? 'Compartilhado' : 'Compartilhar'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {isTyping && (
                    <div className="message ai">
                        <div className="message-avatar"><Bot size={18} /></div>
                        <div className="message-bubble typing-indicator">
                            Buscando seu histórico e pensando...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Chat Bottom ── */}
            <div className={`chat-bottom ${inputFocused || inputValue ? 'input-active' : ''}`}>

                {/* Quick Actions + Suggestions — esconde ao digitar */}
                <div className="chat-chips-area">
                    {/* Quick Actions */}
                    <div className="quick-actions">
                        {QUICK_ACTIONS.map(action => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.id}
                                    className={`quick-action-btn ${action.id === 'exercicios' && showMusclePicker ? 'active' : ''}`}
                                    onClick={() => handleQuickAction(action)}
                                    disabled={isTyping || loadingMessages}
                                    data-tooltip={action.label}
                                >
                                    <Icon size={13} />
                                    <span>{action.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Muscle picker */}
                    {showMusclePicker && (
                        <div className="muscle-picker">
                            {MUSCLE_GROUPS.map(muscle => (
                                <button
                                    key={muscle.name}
                                    className="muscle-chip"
                                    onClick={() => handleMuscleSelect(muscle)}
                                    disabled={isTyping}
                                >
                                    {muscle.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Suggestion chips */}
                    <div className="suggestions">
                        {SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                className="suggestion-chip"
                                onClick={() => handleSuggestion(s)}
                                disabled={isTyping || loadingMessages}
                            >
                                <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <div className="input-area">
                    <form className="input-wrapper" onSubmit={handleSendMessage}>
                        <textarea
                            ref={textareaRef}
                            className="chat-input"
                            rows={1}
                            placeholder={loadingMessages ? 'Carregando...' : 'Pergunte sobre treinos, metas...'}
                            value={inputValue}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            disabled={isTyping || loadingMessages}
                        />
                        <button
                            type="submit"
                            className="send-btn"
                            disabled={!inputValue.trim() || isTyping || loadingMessages}
                            data-tooltip="Enviar"
                        >
                            <Send size={17} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AICoach;
