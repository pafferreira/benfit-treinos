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

    const sizeClasses = {
        small: 'max-w-sm',
        medium: 'max-w-md',
        large: 'max-w-lg',
        full: 'max-w-full'
    };

    // Ensure modal overlays the global header which uses a high z-index (e.g. header CSS uses z-index:1000).
    // We set a high z-index here to avoid the modal being overlapped by the header.
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div
                className={`relative w-[90%] md:w-full ${sizeClasses[size] || 'max-w-lg'} mx-auto bg-white rounded-lg shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-[#dbe3ee]`}
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
                <div className="p-6 overflow-y-auto overscroll-contain flex-1">
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
