import React, { createContext, useState, useContext } from 'react';

const ActionContext = createContext();

export const ActionProvider = ({ children }) => {
    const [action, setAction] = useState(null);

    // action object structure:
    // {
    //   icon: ReactNode,
    //   label: string,
    //   onClick: () => void,
    //   visible: boolean (default true),
    //   role_restricted: boolean (optional)
    // }

    return (
        <ActionContext.Provider value={{ action, setAction }}>
            {children}
        </ActionContext.Provider>
    );
};

export const useAction = () => {
    const context = useContext(ActionContext);
    if (!context) {
        throw new Error('useAction must be used within an ActionProvider');
    }
    return context;
};
