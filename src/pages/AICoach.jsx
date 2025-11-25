import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, BrainCircuit } from 'lucide-react';
import './AICoach.css';

const AICoach = () => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'ai',
            text: 'Olá! Sou o Benfit Coach. 🏋️ Posso te ajudar a criar treinos personalizados e sugerir orientações sobre alimentação. Como posso ajudar você hoje?'
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

        // Simulate AI delay
        setTimeout(() => {
            const responseText = generateResponse(userMsg.text);
            const aiMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: responseText
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    // AI Coach Logic - Focused on workout and diet planning
    const generateResponse = (input) => {
        const lowerInput = input.toLowerCase();

        // Workout creation
        if (lowerInput.includes('treino') || lowerInput.includes('exercício') || lowerInput.includes('musculação')) {
            return "Posso te ajudar a montar um treino personalizado! 💪\n\nPara começar, me diga:\n• Qual seu objetivo? (Hipertrofia, emagrecimento, condicionamento)\n• Quantos dias por semana pode treinar?\n• Tem alguma restrição ou lesão?\n\nVocê também pode explorar os treinos prontos na seção 'Meus Treinos'.";
        }

        // Diet planning
        if (lowerInput.includes('dieta') || lowerInput.includes('alimentação') || lowerInput.includes('nutrição') || lowerInput.includes('comer')) {
            return "A alimentação é fundamental para seus resultados! 🥗\n\nPara uma orientação personalizada, preciso saber:\n• Seu objetivo (ganhar massa, emagrecer, manter)\n• Restrições alimentares\n• Rotina diária\n\nLembre-se: para um plano nutricional completo, consulte um nutricionista.";
        }

        // Pain/injury
        if (lowerInput.includes('dor') || lowerInput.includes('lesão')) {
            return "Sinto muito que esteja com dor. 😔\n\nPara alívio seguro, recomendo:\n• Exercícios isométricos (estáticos)\n• Fortalecimento sem impacto\n• Alongamentos suaves\n\nSe a dor persistir, procure um médico ou fisioterapeuta.";
        }

        // Longevity/elderly
        if (lowerInput.includes('idoso') || lowerInput.includes('idade') || lowerInput.includes('longevidade')) {
            return "Treinar em qualquer idade é possível e importante! 👴👵\n\nFoco principal:\n• Manutenção de massa muscular\n• Equilíbrio e prevenção de quedas\n• Mobilidade articular\n• Caminhadas e exercícios de baixo impacto";
        }

        // Weight loss
        if (lowerInput.includes('emagrecer') || lowerInput.includes('peso') || lowerInput.includes('gordura')) {
            return "Para emagrecer com saúde:\n\n✅ Déficit calórico moderado\n✅ Treino de força (preserva massa muscular)\n✅ Cardio moderado\n✅ Consistência é mais importante que intensidade\n\nQuer que eu monte um treino focado em emagrecimento?";
        }

        // Muscle gain
        if (lowerInput.includes('músculo') || lowerInput.includes('hipertrofia') || lowerInput.includes('ganhar massa')) {
            return "Para ganhar massa muscular:\n\n💪 Treino com sobrecarga progressiva\n💪 4-6 séries de 8-12 repetições\n💪 Alimentação com superávit calórico\n💪 Descanso adequado (sono 7-8h)\n\nVocê já tem uma rotina de treinos? Posso sugerir ajustes!";
        }

        // Default response
        return "Olá! Sou o Benfit Coach. 🏋️\n\nPosso te ajudar com:\n• Criação de treinos personalizados\n• Sugestões de alimentação\n• Dicas de exercícios\n• Orientações sobre saúde e fitness\n\nO que você gostaria de saber?";
    };

    const suggestions = [
        "Quero montar um treino",
        "Como melhorar minha dieta?",
        "Exercícios para idosos",
        "Como ganhar massa muscular?",
        "Treino para emagrecer"
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
                            Online • Especialista em Treinos e Nutrição
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
                            placeholder="Pergunte sobre treinos, dieta ou dicas de saúde..."
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
