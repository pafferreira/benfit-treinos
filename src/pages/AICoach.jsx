import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, User, Sparkles, Plus, MessageSquare, Trash2, Menu, X, Search, Dumbbell, CalendarDays, Target, Play, Share2, BookOpen, Pencil, ThumbsUp, ThumbsDown, Maximize2 } from 'lucide-react';
import { BenfitAvatar } from '../components/icons/BenfitIcons';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { searchHybridMemory, maybeStoreConversation } from '../services/memory';
import { chatWithBenfit, generateConversationTitle, generateEmbedding, rateCoachMessage } from '../services/ai';
import { requestMedia, mediaChanged, getMediaByIds } from '../services/media';
import { DISHES_CHANGED_EVENT } from '../services/dishes';
import { buildUserContext, buildExerciseStats } from '../services/context';
import { useUserRole, useExercises, useExerciseMuscleMap } from '../hooks/useSupabase';
import CoachExerciseCard from '../components/CoachExerciseCard';
import ChatMediaCard from '../components/ChatMediaCard';
import { useCoach } from '../context/coach';
import './AICoach.css';

const MEDIA_KIND_LABELS = { image: 'Imagem', poses: 'Poses', video: 'Vídeo' };

// ── Constantes ───────────────────────────────────────────────────
const SUGGESTIONS = [
    "Como foi meu último treino?",
    "Posso aumentar a carga?",
    "Como melhorar minha recuperação?",
    "Dicas de isometria",
];

const QUICK_ACTIONS = [
    { id: 'historico',  icon: CalendarDays, label: 'Histórico',     type: 'navigate',      path: '/historico' },
    { id: 'treinar',    icon: Play,         label: 'Treinar agora',  type: 'navigate',      path: '/' },
    { id: 'metas',      icon: Target,       label: 'Minhas metas',   type: 'local',         query: 'Minhas metas ativas' },
    { id: 'exercicios', icon: Dumbbell,     label: 'Exercícios',     type: 'muscle_picker'  },
];

const MUSCLE_GROUPS = [
    { name: 'Peitoral',           keywords: ['peitoral', 'peito', 'pectorais'] },
    { name: 'Costas',             keywords: ['costas', 'dorsal', 'latíssimo', 'latissimo', 'remada'] },
    { name: 'Ombros',             keywords: ['ombros', 'ombro', 'deltoides', 'deltoide'] },
    { name: 'Trapézio',           keywords: ['trapézio', 'trapezio'] },
    { name: 'Bíceps',             keywords: ['bíceps', 'biceps', 'bícep', 'bicep'] },
    { name: 'Tríceps',            keywords: ['tríceps', 'triceps', 'trícep', 'tricep'] },
    { name: 'Antebraço',          keywords: ['antebraço', 'antebraco', 'punho', 'preensão', 'preensao'] },
    { name: 'Abdômen',            keywords: ['abdômen', 'abdomen', 'abdominal', 'abdominais', 'core'] },
    { name: 'Lombar',             keywords: ['lombar', 'lombares', 'eretores', 'paravertebrais'] },
    { name: 'Glúteos',            keywords: ['glúteos', 'gluteos', 'glúteo', 'gluteo'] },
    { name: 'Quadríceps',         keywords: ['quadríceps', 'quadriceps', 'quadríceps femoral'] },
    { name: 'Posterior de Coxa',  keywords: ['posterior de coxa', 'isquiotibiais', 'isquiotibial', 'posterior da coxa'] },
    { name: 'Adutores',           keywords: ['adutores', 'adutor', 'interno da coxa', 'interno de coxa'] },
    { name: 'Panturrilha',        keywords: ['panturrilha', 'panturrilhas', 'sóleo', 'soleo'] },
];

const INITIAL_MESSAGE = {
    id: 'initial',
    sender: 'ai',
    text: 'Olá! Sou o **Benfit** 🏋️\n\nConheço seus treinos recentes, suas metas e o catálogo Benfit. Pergunte sobre exercícios, cargas, recuperação ou alimentação.'
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

// Detecta perguntas sobre o histórico PESSOAL do aluno — nunca responder
// com o catálogo; precisa dos dados agregados do banco
const PERSONAL_HISTORY_PATTERNS = [
    /\b(eu\s+)?(fiz|realizei|executei|treinei|completei)\b/i,
    /\bquant[oa]s?\s+(vezes|exerc[íi]cios|s[ée]ries|treinos|sess[õo]es)\b.*\b(fiz|meu|minha|tenho)\b/i,
    /\bat[ée]\s+hoje\b/i,
    /\bmeu\s+hist[óo]rico\b/i,
    /\bminha\s+(evolu[çc][ãa]o|frequ[êe]ncia|progress[ãa]o)\b/i,
];
const isPersonalHistoryQuery = (text) =>
    PERSONAL_HISTORY_PATTERNS.some(p => p.test(text));

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
// variant="page": tela /coach completa. variant="sheet": painel aberto sobre qualquer tela.
const AICoach = ({ variant = 'page' }) => {
    const { exercises: libraryExercises, reload: reloadExercises } = useExercises();
    const muscleMap = useExerciseMuscleMap();
    const isSheet = variant === 'sheet';
    const navigate = useNavigate();
    const location = useLocation();
    const {
        screen, conversationId: sharedConvId, setConversationId: setSharedConvId,
        pendingQuestion, consumePendingQuestion, releaseSheet, closeCoach,
    } = useCoach();
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

    // Conversa a retomar: o painel continua a última; a página só quando veio do painel ("expandir").
    const resumeConvIdRef = useRef(isSheet || location.state?.resume ? sharedConvId : null);
    const loadConversationRef = useRef(null);
    const sendMessageRef = useRef(null);
    const [ready, setReady] = useState(false);

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

                if (resumeConvIdRef.current) {
                    await loadConversationRef.current?.(resumeConvIdRef.current);
                }
            } catch (err) {
                console.error('[Benfit Coach] Erro crítico no init:', err);
            } finally {
                setReady(true);
            }
        };
        init();
    }, []);

    // Nota: o chat NÃO dispara 'app-inner-scroll' — esconder o nav mudava a
    // altura da área de mensagens a cada scroll e fazia a tela "pular".

    const scrollToBottom = useCallback((force = false) => {
        const area = messagesAreaRef.current;
        if (!area) return;
        // Só auto-rola se o usuário já está perto do fundo (ou forçado, ex: mensagem enviada)
        const nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 120;
        if (!force && !nearBottom) return;
        area.scrollTop = area.scrollHeight;
    }, []);

    const lastSenderRef = useRef(null);
    useEffect(() => {
        const last = messages[messages.length - 1];
        const force = last?.sender === 'user' && last.id !== lastSenderRef.current;
        if (force) lastSenderRef.current = last.id;
        scrollToBottom(force);
    }, [messages, isTyping, scrollToBottom]);

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
                // Cartões de mídia: o status e o arquivo vêm atualizados da fila b_media.
                const mediaRef = (m) => m.provider === 'benfit_media' ? m.provider_parts?.[0] : null;
                const mediaIds = msgs.map(mediaRef).filter(Boolean).map(r => r.media_id);
                const mediaById = mediaIds.length
                    ? await getMediaByIds(mediaIds).catch(() => new Map())
                    : new Map();
                setMessages([INITIAL_MESSAGE, ...msgs.flatMap(m => {
                    const ref = mediaRef(m);
                    if (ref) {
                        const media = mediaById.get(ref.media_id);
                        return [{
                            id: m.id, sender: 'ai', text: '',
                            media: media
                                ? { kind: ref.kind, name: ref.name, status: media.status, url: media.url, frames: media.frames, error: media.error }
                                : { kind: ref.kind, name: ref.name, status: 'removida' },
                        }];
                    }
                    if (m.role === 'system') return [];
                    return [{
                        id: m.id, dbId: m.id, sender: m.role === 'user' ? 'user' : 'ai',
                        text: m.content, feedback: m.feedback ?? null,
                    }];
                })]);
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

    useEffect(() => {
        loadConversationRef.current = loadConversation;
        sendMessageRef.current = sendMessage;
    });

    // Mantém a conversa atual compartilhada entre o painel e a página /coach.
    useEffect(() => {
        if (currentConvId) setSharedConvId(currentConvId);
    }, [currentConvId, setSharedConvId]);

    // Pergunta enviada ao abrir o painel (ex.: atalhos da tela de Dieta).
    // Espera a resposta anterior terminar para não perder a pergunta.
    useEffect(() => {
        if (!isSheet || !ready || !pendingQuestion || isTyping) return;
        consumePendingQuestion();
        sendMessageRef.current?.(pendingQuestion);
    }, [isSheet, ready, pendingQuestion, isTyping, consumePendingQuestion]);

    const handleExpand = () => {
        releaseSheet();
        navigate('/coach', { state: { resume: true } });
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
            if (convId === sharedConvId) setSharedConvId(null);
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
            if (isSheet) closeCoach();
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

    // ── Avaliação 👍/👎 das respostas do Coach ─────────────────────
    // As gravações de cada mensagem rodam em fila: cliques rápidos (👍 e logo 👎)
    // chegam ao banco na mesma ordem em que aparecem na tela.
    const feedbackQueueRef = useRef(new Map());
    const handleFeedback = (msg, value) => {
        const feedback = msg.feedback === value ? null : value;
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, feedback } : m));
        const previous = feedbackQueueRef.current.get(msg.dbId) || Promise.resolve();
        const next = previous.then(() => rateCoachMessage(msg.dbId, feedback)).catch(e => {
            console.error('[Feedback] Falha ao salvar avaliação:', e?.message);
            if (feedbackQueueRef.current.get(msg.dbId) === next) {
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, feedback: msg.feedback } : m));
            }
        });
        feedbackQueueRef.current.set(msg.dbId, next);
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

    // Mídia pedida pelo Benfit: entra na conversa como cartão, com o resultado e
    // o aviso de aprovação (Mídias Benfit). onDone atualiza a tela do item.
    const trackMedia = ({ kind, entityType, entityId, name }, onDone) => {
        const id = `media-${entityId}-${kind}-${Date.now()}`;
        const update = (media) => setMessages(prev => prev.map(m => m.id === id ? { ...m, media: { ...m.media, ...media } } : m));
        setMessages(prev => [...prev, { id, sender: 'ai', text: '', media: { kind, name, status: 'gerando' } }]);
        const uid = userIdRef.current;
        const convId = currentConvIdRef.current;
        requestMedia(kind, { entityType, entityId })
            .then(media => {
                update({ status: media?.status || 'pendente', url: media?.url, frames: media?.frames });
                mediaChanged();
                onDone?.();
                // Guarda o cartão na conversa (papel "system": não vai para o modelo).
                if (media?.id && uid && convId) {
                    supabaseHelpers.saveChatMessage(uid, 'system', `${MEDIA_KIND_LABELS[kind]} de ${name} gerada pelo Benfit.`, convId, {
                        provider: 'benfit_media',
                        providerParts: [{ media_id: media.id, kind, name }],
                    }).catch(err => console.warn('[Benfit] Cartão da mídia não salvo na conversa:', err?.message));
                }
            })
            .catch(err => {
                console.warn('[Benfit] Mídia não gerada:', err?.message);
                update({ status: 'falhou', error: `Não foi possível gerar: ${err?.message || 'erro desconhecido'}.` });
            });
    };

    // Pratos criados pelo Benfit (etapa 2D): avisa a tela Dieta e gera a foto.
    const reloadDishes = () => window.dispatchEvent(new CustomEvent(DISHES_CHANGED_EVENT));
    const handleDishActions = (actions) => {
        const dishes = (actions || []).filter(a => a?.type === 'dish_created');
        if (dishes.length === 0) return;
        reloadDishes();
        mediaChanged();
        dishes.filter(a => !a.existing).forEach(action => {
            trackMedia({ kind: 'image', entityType: 'dish', entityId: action.dishId, name: action.name }, reloadDishes);
        });
    };

    // gerar_midia: o Benfit pediu imagem, poses ou vídeo de um item do catálogo.
    const handleMediaActions = (actions) => {
        const requests = (actions || []).filter(a => a?.type === 'media_requested' && a.entityId);
        requests.forEach(action => {
            action.kinds.forEach(kind => {
                trackMedia(
                    { kind, entityType: action.entityType, entityId: action.entityId, name: action.name },
                    action.entityType === 'dish' ? reloadDishes : reloadExercises,
                );
            });
        });
    };

    // Exercício novo criado pelo Benfit (etapa 2C): atualiza o catálogo e gera a imagem.
    // Ordem dos cartões: imagem dos itens novos primeiro, depois o que gerar_midia pediu.
    const handleCoachActions = (actions) => {
        const created = (actions || []).filter(a => a?.type === 'exercise_created' && !a.existing);
        if (created.length > 0) {
            reloadExercises();
            mediaChanged();
            created.forEach(action => {
                trackMedia({ kind: 'image', entityType: 'exercise', entityId: action.exerciseId, name: action.name }, reloadExercises);
            });
        }
        handleDishActions(actions);
        handleMediaActions(actions);
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
            if (uid && convId) {
                await supabaseHelpers.saveChatMessage(uid, 'user', text, convId);
                if (convId) supabaseHelpers.touchConversation(convId).catch(() => {});
            }

            // ── Busca no conhecimento compartilhado + memórias do aluno ──
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

            // Pergunta sobre histórico pessoal? Nunca responder com catálogo —
            // busca estatísticas agregadas de todo o histórico para o Coach
            const isPersonalHistory = isPersonalHistoryQuery(text);
            let exerciseStats = null;
            if (isPersonalHistory && uid) {
                exerciseStats = await buildExerciseStats(uid).catch(() => null);
            }

            // Resposta direta do catálogo APENAS para o seletor de músculos
            // ("Exercícios de X") — qualquer pergunta livre vai ao Coach,
            // que usa o catálogo como contexto e responde de forma natural.
            const isMusclePickerQuery = /^Exercícios de /.test(text);
            const directResults = (isMusclePickerQuery && !isPersonalHistory)
                ? sharedResults.filter(r => r.similarity >= DIRECT_SIMILARITY_THRESHOLD)
                : [];
            const directAnswer = directResults.length > 0
                ? formatSharedKnowledgeResponse(directResults)
                : null;

            let responseText;
            let responseId = null;
            let coachActions = null;
            let fallbackReason = null;

            if (directAnswer) {
                responseText = directAnswer;
                if (uid && convId) {
                    const saved = await supabaseHelpers.saveChatMessage(uid, 'assistant', responseText, convId, {
                        provider: 'shared_knowledge',
                    });
                    responseId = saved?.id || null;
                }
            } else {
                const memoriesText = userMemories.map((m, i) => {
                    const dateStr = m.metadata?.date ? new Date(m.metadata.date).toLocaleDateString('pt-BR') : '';
                    return `[${i + 1}] ${dateStr}: ${m.content}`;
                }).join('\n');
                const sharedText = sharedResults.map((r, i) => `[${i + 1}] ${r.content}`).join('\n');

                // O perfil e as regras do Coach ficam no prompt do servidor;
                // aqui vão só os dados do aluno.
                const screenText = screen?.details
                    ? `## Onde o aluno está no app agora\nTela: ${screen.label}\n${screen.details}`
                    : '';
                const fullContext = [
                    structuredContext,
                    screenText,
                    exerciseStats,
                    sharedText ? `## Base de conhecimento Benfit (trechos relacionados à pergunta)\n${sharedText}` : '',
                    memoriesText ? `## Memórias de conversas anteriores\n${memoriesText}` : '',
                ].filter(Boolean).join('\n\n');

                const aiResponse = await chatWithBenfit(text, fullContext, convId);
                responseText = aiResponse.text;
                responseId = aiResponse.messageId || null;
                coachActions = aiResponse.actions;
                fallbackReason = aiResponse.fallbackReason || null;

                if (uid) {
                    maybeStoreConversation(uid, text, responseText)
                        .catch(err => console.warn('[Benfit Coach] Memória não salva:', err?.message));
                }
            }

            const aiMsg = { id: responseId || Date.now() + 1, dbId: responseId, sender: 'ai', text: responseText, fallbackReason };
            setMessages(prev => [...prev, aiMsg]);
            // Depois da resposta, para os cartões de mídia aparecerem abaixo dela.
            handleCoachActions(coachActions);

            // Título imediato (palavras-chave da mensagem) + refinamento pelo Coach
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

    const currentConvTitle = conversations.find(c => c.id === currentConvId)?.title || 'Benfit';

    const suggestions = isSheet && screen?.suggestions?.length ? screen.suggestions : SUGGESTIONS;

    return (
        <div className={`page-container ${isSheet ? 'coach-variant-sheet' : ''}`}>

            {/* ── Header bar ── */}
            {isSheet ? (
            <div className="coach-header">
                <button
                    className="coach-header-btn"
                    onClick={handleNewConversation}
                    aria-label="Nova conversa"
                    title="Nova conversa"
                >
                    <Plus size={18} />
                </button>
                <span className="coach-header-title">{currentConvTitle}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                        className="coach-header-btn"
                        onClick={handleExpand}
                        disabled={isTyping}
                        aria-label="Abrir em tela cheia"
                        title={isTyping ? 'Aguarde a resposta para abrir em tela cheia' : 'Tela cheia'}
                    >
                        <Maximize2 size={17} />
                    </button>
                    <button
                        className="coach-header-btn"
                        onClick={closeCoach}
                        aria-label="Fechar o Benfit"
                        title="Fechar"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            ) : (
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
            )}

            {isSheet && screen?.label && (
                <div className="coach-screen-chip">
                    <BenfitAvatar size={18} />
                    <span>Ajudando em: {screen.label}</span>
                </div>
            )}

            {/* ── Overlay ── */}
            {!isSheet && sidebarOpen && <div className="sidebar-overlay" />}

            {/* ── Sidebar drawer ── */}
            {!isSheet && (
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
            )}

            {/* ── Mensagens ── */}
            <div className="messages-area" ref={messagesAreaRef}>
                {loadingMessages ? (
                    <div className="messages-loading">Carregando conversa...</div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.sender}`}>
                            <div className="message-avatar">
                                {msg.sender === 'ai' ? <BenfitAvatar size={28} /> : <User size={18} />}
                            </div>
                            <div className="message-bubble">
                                {msg.media && <ChatMediaCard media={msg.media} />}
                                {msg.text && renderText(msg.text)}
                                {msg.fallbackReason && (
                                    <div className="coach-fallback-note" role="note">
                                        <strong>Aviso só para admin:</strong> o Claude não respondeu e a reserva assumiu, sem ferramentas.
                                        <span className="coach-fallback-reason">Motivo: {msg.fallbackReason}</span>
                                    </div>
                                )}
                                {msg.sender === 'ai' && msg.id !== 'initial' && !msg.media && (
                                    <CoachExerciseCard text={msg.text} exercises={libraryExercises} muscleMap={muscleMap} />
                                )}
                                {msg.sender === 'ai' && msg.dbId && (
                                    <div className="coach-feedback" role="group" aria-label="Avaliar resposta">
                                        <button
                                            className={`coach-feedback-btn ${msg.feedback === 1 ? 'active' : ''}`}
                                            onClick={() => handleFeedback(msg, 1)}
                                            aria-label="Resposta útil"
                                            aria-pressed={msg.feedback === 1}
                                        >
                                            <ThumbsUp size={12} />
                                        </button>
                                        <button
                                            className={`coach-feedback-btn ${msg.feedback === -1 ? 'active' : ''}`}
                                            onClick={() => handleFeedback(msg, -1)}
                                            aria-label="Resposta não ajudou"
                                            aria-pressed={msg.feedback === -1}
                                        >
                                            <ThumbsDown size={12} />
                                        </button>
                                    </div>
                                )}
                                {canShare && msg.sender === 'ai' && msg.id !== 'initial' && !msg.media && (
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
                        <div className="message-avatar"><BenfitAvatar size={28} /></div>
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
                    {/* Quick Actions (no painel, as sugestões da tela ocupam o espaço) */}
                    {!isSheet && (
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
                    )}

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
                        {suggestions.map((s, i) => (
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
