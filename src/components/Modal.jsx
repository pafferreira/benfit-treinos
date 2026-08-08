import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const openModals = []; // Stack to keep track of open modals

const Modal = ({ isOpen, onClose, title, children, footer, size = 'medium' }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        // Register this modal instance
        const modalId = Symbol('modal');
        openModals.push(modalId);

        // Lock body scroll
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEsc = (e) => {
            // Only strictly check for Escape key
            if (e.key === 'Escape') {
                // Only close if this is the topmost modal
                if (openModals[openModals.length - 1] === modalId) {
                    // Prevent event from bubbling to underlying modals if needed, 
                    // though the check above handles the logic.
                    // e.stopPropagation(); 
                    if (onCloseRef.current) onCloseRef.current();
                }
            }
        };

        window.addEventListener('keydown', handleEsc);

        return () => {
            // Remove from stack
            const index = openModals.indexOf(modalId);
            if (index > -1) {
                openModals.splice(index, 1);
            }

            // Restore body scroll only if no other modals are open
            if (openModals.length === 0) {
                document.body.style.overflow = originalOverflow || 'unset';
            }

            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen]);

    // Limite de largura vale só a partir do md: abaixo disso a largura já é
    // controlada por w-full/max-w-[calc(...)]/sm:w-[90%] (margem garantida no
    // mobile) — um max-w-* sem prefixo aqui brigaria com esses valores.
    const sizeClasses = {
        small: 'md:max-w-sm',
        medium: 'md:max-w-md',
        large: 'md:max-w-lg',
        full: 'md:max-w-[1400px]'
    };

    // Ensure modal overlays the global header which uses a high z-index (e.g. header CSS uses z-index:1000).
    // We set a high z-index here to avoid the modal being overlapped by the header.
    //
    // `absolute` (não `fixed`): o app roda dentro de `.mobile-container`, um frame
    // de largura mobile (max-width: 28rem) mesmo no desktop. `fixed` ignora esse
    // frame e cobre a janela inteira do navegador — `absolute` respeita o
    // `.mobile-container` (position: relative), igual o `.bottom-nav` já faz.
    // size="full" (ExerciseModal, AvatarModal, EditProfileModal) costuma ter abas
    // com quantidade de conteúdo bem diferente entre si (ex: Detalhes vs Planos
    // vazio) — centralizar verticalmente faz o topo pular de posição a cada troca
    // de aba, porque a altura muda e o centro é recalculado. Ancorado no topo
    // (items-start), o topo fica fixo e só o rodapé encolhe/cresce com o conteúdo.
    return (
        <div
            className={`absolute inset-0 z-[9999] flex ${size === 'full' ? 'items-start pt-6 sm:pt-10' : 'items-center'} justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-200`}
            onClick={handleBackdropClick}
        >
            <div
                className={`relative w-full max-w-[calc(100vw-2.5rem)] sm:w-[90%] md:w-full ${sizeClasses[size] || 'md:max-w-lg'} mx-auto bg-white rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-x-hidden animate-in zoom-in-95 duration-200 border border-[#dbe3ee]`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-[#e8eef6] shrink-0">
                    <h2 className="text-lg font-bold text-[var(--color-text-main)]">{title}</h2>
                    <button
                        className="p-2 text-[var(--color-subtext-light)] hover:text-[var(--color-primary)] hover:bg-[#f3f6fb] rounded-md transition-colors"
                        onClick={onClose}
                        title="Fechar"
                        aria-label="Fechar"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1">
                    {children}
                </div>
                {footer && (
                    <div className="p-4 border-t border-[#e8eef6] bg-gray-50 flex justify-end shrink-0 rounded-b-lg">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
