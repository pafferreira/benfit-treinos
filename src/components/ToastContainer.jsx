import React, { useEffect, useState } from 'react'
import './ToastContainer.css'

const Toast = ({ id, message, type, onDone }) => {
    useEffect(() => {
        const t = setTimeout(() => onDone(id), 3500);
        return () => clearTimeout(t);
    }, [id, onDone]);

    return (
        <div className={`toast ${type || 'info'}`} role="status">
            {message}
        </div>
    );
}

const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handler = (e) => {
            const { message, type } = e.detail || {};
            const id = Date.now() + Math.random();
            setToasts(prev => [...prev, { id, message, type }]);
        };
        window.addEventListener('app-toast', handler);
        return () => window.removeEventListener('app-toast', handler);
    }, []);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <div className="toast-container" aria-live="polite">
            {toasts.map(t => (
                <Toast key={t.id} id={t.id} message={t.message} type={t.type} onDone={remove} />
            ))}
        </div>
    );
}

export default ToastContainer
