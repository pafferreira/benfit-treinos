// Benfit Coach acessível de qualquer tela: estado compartilhado entre o
// botão do cabeçalho, o painel deslizante e a página /coach.
import { createContext, useContext, useEffect, useMemo } from 'react';

export const CoachContext = createContext(null);

export const useCoach = () => {
    const ctx = useContext(CoachContext);
    if (!ctx) throw new Error('useCoach precisa estar dentro do CoachProvider');
    return ctx;
};

// Cada tela informa ao Coach onde o aluno está. `screen` = { label, details, suggestions }.
// Telas empilham: um modal aberto por cima de uma página vence enquanto estiver aberto.
// Passe `null` para não registrar nada (ex.: modal fechado).
export const useCoachScreen = (screen) => {
    const ctx = useContext(CoachContext);
    const key = screen ? JSON.stringify(screen) : null;
    const register = ctx?.registerScreen;

    // Memoiza pelo conteúdo, não pela referência do objeto recriado a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stable = useMemo(() => screen, [key]);

    useEffect(() => {
        if (!register || !stable) return undefined;
        return register(stable);
    }, [register, stable]);
};
