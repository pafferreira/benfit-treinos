import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { searchUserMemory, maybeStoreConversation } from '../services/memory';
import { chatWithBenfit } from '../services/ai';
import { buildUserContext } from '../services/context';
import './AICoach.css';

const SUGGESTIONS = [
    "Como foi meu último treino?",
    "Quais metas eu tenho?",
    "Posso aumentar a carga?",
    "Como melhorar minha recuperação?",
    "Dicas de isometria para iniciantes",
];

const INITIAL_MESSAGE = {
    id: 'initial',
    sender: 'ai',
    text: 'Olá! Sou o **Benfit Coach** 🏋️\n\nTenho acesso ao seu histórico completo de treinos e metas. Pergunte qualquer coisa — sobre sua evolução, cargas, recuperação ou planejamento!'
};

const AICoach = () => {
    const [messages, setMessages] = useState([INITIAL_MESSAGE]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [userId, setUserId] = useState(null);
    const [structuredContext, setStructuredContext] = useState('');
    const [isUIVisible, setIsUIVisible] = useState(true); // Controle local de visibilidade
    const messagesEndRef = useRef(null);
    const messagesAreaRef = useRef(null); // Ref direto para o elemento DOM que faz scroll
    const userIdRef = useRef(null);
    const textareaRef = useRef(null);
    const lastScrollRef = useRef(0);

    // Load user, chat history, and structured context on mount
    useEffect(() => {
        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { setLoadingHistory(false); return; }

                setUserId(user.id);
                userIdRef.current = user.id;

                // Carrega histórico de mensagens e contexto estruturado em paralelo
                const [history, userCtx] = await Promise.allSettled([
                    supabaseHelpers.getChatHistory(user.id, 30),
                    buildUserContext(user.id)
                ]);

                if (history.status === 'fulfilled' && history.value?.length > 0) {
                    const loaded = history.value.map(m => ({
                        id: m.id,
                        sender: m.role === 'user' ? 'user' : 'ai',
                        text: m.content
                    }));
                    setMessages([INITIAL_MESSAGE, ...loaded]);
                }

                if (userCtx.status === 'fulfilled' && userCtx.value) {
                    setStructuredContext(userCtx.value);
                    console.log('[Benfit Coach] Contexto estruturado carregado:', {
                        length: userCtx.value.length,
                        preview: userCtx.value.substring(0, 100) + '...'
                    });
                }
            } catch (err) {
                console.error('[Benfit Coach] Erro crítico no init:', err);
            } finally {
                setLoadingHistory(false);
            }
        };
        init();
    }, []);

    // Comunica scroll interno para o DashboardLayoutvia evento customizado
    useEffect(() => {
        const area = messagesAreaRef.current;
        if (!area) return;

        const onScroll = () => {
            const scrollTop = area.scrollTop;
            const direction = scrollTop > lastScrollRef.current ? 'down' : 'up';
            lastScrollRef.current = scrollTop;

            const isNowVisible = (scrollTop <= 10) || (direction !== 'down');
            setIsUIVisible(isNowVisible);

            window.dispatchEvent(new CustomEvent('app-inner-scroll', {
                detail: { scrollTop, direction }
            }));
        };

        area.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            area.removeEventListener('scroll', onScroll);
            setIsUIVisible(true);
        };
    }, []);

    // Scroll automático para a última mensagem
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = inputValue.trim();
        if (!text || isTyping) return;

        const uid = userIdRef.current || userId;
        const userMsg = { id: Date.now(), sender: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            // 1. Salva mensagem do usuário no histórico (b_ai_chat_history)
            if (uid) {
                supabaseHelpers.saveChatMessage(uid, 'user', text).catch(err =>
                    console.warn('[Benfit Coach] Erro ao salvar msg do usuário:', err?.message)
                );
            }

            // 2. Busca memórias vetoriais relevantes (treinos, metas, conversas anteriores)
            let contextText = 'Nenhum histórico encontrado.';
            if (uid) {
                try {
                    const memories = await searchUserMemory(uid, text, 0.35, 6);
                    if (memories && memories.length > 0) {
                        contextText = memories
                            .map((m, i) => {
                                const dateStr = m.metadata?.date
                                    ? new Date(m.metadata.date).toLocaleDateString('pt-BR')
                                    : '';
                                const typeLabel = m.metadata?.type === 'workout' ? '🏋️ Treino'
                                    : m.metadata?.type === 'goal' ? '🎯 Meta'
                                        : m.metadata?.type === 'conversation' ? '💬 Conversa anterior'
                                            : '📌 Registro';
                                return `[${i + 1}] ${typeLabel} ${dateStr}: ${m.content}`;
                            })
                            .join('\n');
                        console.log(`[Benfit Coach] ${memories.length} memórias recuperadas para contexto.`);
                    } else {
                        console.log('[Benfit Coach] Nenhuma memória relevante encontrada para este contexto.');
                    }
                } catch (memErr) {
                    console.warn('[Benfit Coach] Falha ao buscar memória:', memErr?.message);
                }
            }

            // 3. Gera resposta com o Gemini combinando:
            //    - Contexto estruturado do banco (perfil, planos, histórico, exercícios)
            //    - Memórias semânticas relevantes da conversa
            const instructions = `
## REGRAS DE OURO PARA O BENFIT COACH:
1. Você tem acesso TOTAL e PRIVILEGIADO ao catálogo de exercícios, metas e histórico do aluno logo abaixo.
2. SE O ALUNO PERGUNTAR SOBRE EXERCÍCIOS, VOCÊ DEVE CONSULTAR O "Catálogo Completo de Exercícios Disponíveis" fornecido abaixo.
3. NUNCA, EM HIPÓTESE ALGUMA, diga que não tem acesso à lista de exercícios — ela está logo abaixo de você no prompt.
4. Se o aluno não tiver algo registrado (ex: sem metas), diga APENAS que ele ainda não definiu metas no app.
5. Seja direto, técnico mas motivador.`;

            if (!structuredContext) {
                console.warn('[Benfit Coach] Enviando mensagem sem contexto estruturado! Verifique logs de carregamento.');
            }

            const fullContext = [
                instructions,
                structuredContext ? `### DADOS DO ALUNO NO SISTEMA:\n${structuredContext}` : '### [AVISO]: DADOS DO BANCO INDISPONÍVEIS.',
                contextText !== 'Nenhum histórico encontrado.' ? `\n## MEMÓRIAS DA CONVERSA:\n${contextText}` : ''
            ].filter(Boolean).join('\n\n---\n\n');

            const responseText = await chatWithBenfit(text, fullContext);

            const aiMsg = { id: Date.now() + 1, sender: 'ai', text: responseText };
            setMessages(prev => [...prev, aiMsg]);

            // 4. Salva resposta do Coach no histórico (b_ai_chat_history)
            if (uid) {
                supabaseHelpers.saveChatMessage(uid, 'assistant', responseText).catch(err =>
                    console.warn('[Benfit Coach] Erro ao salvar msg do coach:', err?.message)
                );
            }

            // 5. Salva na memória vetorial APENAS se for uma conversa rica
            //    (classificador inteligente em memory.js decide)
            if (uid) {
                maybeStoreConversation(uid, text, responseText).catch(err =>
                    console.warn('[Benfit Coach] Não foi possível salvar conversa na memória vetorial:', err?.message)
                );
            }

        } catch (error) {
            console.error('[Benfit Coach] Erro:', error);
            setMessages(prev => [...prev, {
                id: Date.now() + 2,
                sender: 'ai',
                text: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSuggestion = (suggText) => {
        setInputValue(suggText);
        textareaRef.current?.focus();
    };


    const handleTextareaChange = (e) => {
        setInputValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'; // máx ~4 linhas (96px)
    };

    // Enter envia; Shift+Enter quebra linha
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputValue.trim() && !isTyping && !loadingHistory) {
                handleSendMessage(e);
                // Reset altura do textarea após envio
                if (textareaRef.current) textareaRef.current.style.height = 'auto';
            }
        }
    };

    // Render message text with basic markdown (bold, line breaks, bullet points)
    const renderText = (text) => {
        return text.split('\n').map((line, i, arr) => {
            const isBullet = line.trim().startsWith('* ');
            const content = isBullet ? line.trim().substring(2) : line;

            return (
                <div key={i} style={{ marginBottom: isBullet ? '0.15rem' : '0.4rem', display: 'flex', alignItems: 'flex-start' }}>
                    {isBullet && <span style={{ marginRight: '0.4rem', color: 'var(--color-primary)' }}>•</span>}
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

    return (
        <div className={`page-container ${!isUIVisible ? 'ui-hidden' : ''}`}>
            <div className="messages-area" ref={messagesAreaRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.sender}`}>
                        <div className="message-avatar">
                            {msg.sender === 'ai' ? <Bot size={18} /> : <User size={18} />}
                        </div>
                        <div className="message-bubble">
                            {renderText(msg.text)}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="message ai">
                        <div className="message-avatar"><Bot size={18} /></div>
                        <div className="message-bubble" style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                            Buscando seu histórico e pensando...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-bottom">
                {/* Suggestions */}
                <div className="suggestions">
                    {SUGGESTIONS.map((s, i) => (
                        <button
                            key={i}
                            className="suggestion-chip"
                            onClick={() => handleSuggestion(s)}
                            disabled={isTyping || loadingHistory}
                        >
                            <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                            {s}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div className="input-area">
                    <form className="input-wrapper" onSubmit={handleSendMessage}>
                        <textarea
                            ref={textareaRef}
                            className="chat-input"
                            rows={1}
                            placeholder={loadingHistory ? 'Carregando histórico...' : 'Pergunte sobre treinos, metas... (Enter envia, Shift+Enter = nova linha)'}
                            value={inputValue}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            disabled={isTyping || loadingHistory}
                        />
                        <button type="submit" className="send-btn" disabled={!inputValue.trim() || isTyping || loadingHistory} data-tooltip="Enviar (Enter)">
                            <Send size={17} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AICoach;
