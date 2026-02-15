import { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEsc);
        }

        return () => {
            document.body.style.overflow = 'unset';
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
                className={`relative w-[90%] md:w-full ${sizeClasses[size] || 'max-w-lg'} mx-auto bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-[#dbe3ee]`}
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
                <div className="p-6 overflow-y-auto overscroll-contain">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
