import { useCallback, useMemo, useRef, useState } from 'react';
import { CoachContext } from './coach';

export const CoachProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    // O painel só monta o chat depois da primeira abertura e o mantém montado,
    // para a conversa sobreviver à navegação entre telas.
    const [isMounted, setIsMounted] = useState(false);
    const [screens, setScreens] = useState([]);
    const [pendingQuestion, setPendingQuestion] = useState(null);
    // Conversa em andamento, compartilhada entre o painel e a página /coach.
    const [conversationId, setConversationId] = useState(null);
    const nextId = useRef(0);

    const registerScreen = useCallback((screen) => {
        nextId.current += 1;
        const id = nextId.current;
        setScreens((prev) => [...prev, { ...screen, id }]);
        return () => setScreens((prev) => prev.filter((s) => s.id !== id));
    }, []);

    const openCoach = useCallback((question = null) => {
        setIsMounted(true);
        setIsOpen(true);
        if (question) setPendingQuestion(question);
    }, []);

    const closeCoach = useCallback(() => setIsOpen(false), []);

    // Ao expandir para a página /coach, o painel desmonta; a página assume a conversa.
    const releaseSheet = useCallback(() => {
        setIsOpen(false);
        setIsMounted(false);
    }, []);

    const consumePendingQuestion = useCallback(() => {
        setPendingQuestion(null);
    }, []);

    const value = useMemo(() => ({
        isOpen,
        isMounted,
        screen: screens[screens.length - 1] || null,
        registerScreen,
        openCoach,
        closeCoach,
        releaseSheet,
        pendingQuestion,
        consumePendingQuestion,
        conversationId,
        setConversationId,
    }), [isOpen, isMounted, screens, registerScreen, openCoach, closeCoach, releaseSheet, pendingQuestion, consumePendingQuestion, conversationId]);

    return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
};

export default CoachProvider;
