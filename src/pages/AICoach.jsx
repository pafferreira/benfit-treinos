import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, BrainCircuit } from 'lucide-react';
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

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulate AI Delay
        setTimeout(() => {
            const responseText = generateMockResponse(userMsg.text);
            const aiMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: responseText
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    // Mock AI Logic (Persona: Natural, Elderly, Isometric)
    const generateMockResponse = (input) => {
        const lowerInput = input.toLowerCase();

        if (lowerInput.includes('dor') || lowerInput.includes('joelho') || lowerInput.includes('costas')) {
            return "Sinto muito que esteja com dor. Lembre-se: dor é um sinal de alerta. Para alívio seguro, recomendo **exercícios isométricos** (estáticos). Eles fortalecem sem gerar atrito na articulação. Tente sustentar a posição por 15-20 segundos. Se persistir, procure um médico.";
        }

        if (lowerInput.includes('idoso') || lowerInput.includes('idade') || lowerInput.includes('velho')) {
            return "A idade é apenas um número, mas a biologia exige cuidados. O foco principal deve ser **manutenção de massa muscular** (para evitar sarcopenia) e **equilíbrio** (para evitar quedas). Caminhadas e agachamentos assistidos (segurando na cadeira) são excelentes.";
        }

        if (lowerInput.includes('emagrecer') || lowerInput.includes('peso')) {
            return "Para emagrecer com saúde, foque em **constância** e não em intensidade extrema. Movimentos naturais como caminhar, agachar e carregar pesos moderados ativam o metabolismo de forma sustentável. A alimentação natural também é chave.";
        }

        if (lowerInput.includes('forte') || lowerInput.includes('músculo') || lowerInput.includes('hipertrofia')) {
            return "Força real vem do controle do corpo. Antes de adicionar muita carga, domine os movimentos básicos: agachamento profundo, flexão de braços e barra fixa. A força construída assim é funcional e duradoura.";
        }

        return "Excelente pergunta. Na visão da educação física natural, o importante é manter o corpo capaz de realizar as tarefas do dia a dia com vigor. Foque na técnica perfeita antes da carga. Posso sugerir um treino de mobilidade?";
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
