import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, BrainCircuit } from 'lucide-react';
import { sendMessageToAI } from '../services/openai';
import './AICoach.css';

const AICoach = () => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'ai',
            text: 'Olá! Sou o Benfit Coach. Minha especialidade é saúde natural, longevidade e biomecânica. Como posso ajudar você a se movimentar melhor hoje?'
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = {
            id: Date.now(),
            sender: 'user',
            text: inputValue
        };

        // Update UI immediately with user message
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputValue('');
        setIsTyping(true);

        try {
            // Call OpenAI API
            const responseText = await sendMessageToAI(newMessages);

            const aiMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: responseText
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Failed to get response", error);
            const errorMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: "Ocorreu um erro ao processar sua mensagem. Verifique sua conexão."
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const suggestions = [
        "Tenho dor no joelho",
        "Exercício para idosos",
        "Como ganhar força?",
        "O que é isometria?",
        "Treino rápido de 15min"
    ];

    return (
        <div className="page-container" style={{ height: '100%' }}>
            <div className="chat-container">
                {/* Header */}
                <div className="chat-header">
                    <div className="coach-avatar-wrapper">
                        <BrainCircuit size={28} />
                    </div>
                    <div className="coach-info">
                        <h2>Benfit Coach</h2>
                        <div className="coach-status">
                            <div className="status-dot"></div>
                            Online • Especialista em Longevidade
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="messages-area">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.sender}`}>
                            <div className="message-avatar">
                                {msg.sender === 'ai' ? <Bot size={20} /> : <User size={20} />}
                            </div>
                            <div className="message-bubble">
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="message ai">
                            <div className="message-avatar"><Bot size={20} /></div>
                            <div className="message-bubble" style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                                Digitando...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestions */}
                <div className="suggestions">
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            className="suggestion-chip"
                            onClick={() => setInputValue(s)}
                        >
                            <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                            {s}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div className="input-area">
                    <form className="input-wrapper" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Pergunte sobre treinos, dores ou dicas de saúde..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button type="submit" className="send-btn" disabled={!inputValue.trim() || isTyping}>
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AICoach;
