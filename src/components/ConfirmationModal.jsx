import React from 'react';
import Modal from './Modal';
import { AlertTriangle, Info } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Excluir', cancelText = 'Cancelar', isDangerous = true }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="small"
        >
            <div className="flex flex-col items-center text-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDangerous ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
                    {isDangerous ? <AlertTriangle size={28} /> : <Info size={28} />}
                </div>

                <div className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {message}
                </div>

                <div className="flex w-full justify-center gap-3 mt-4">
                    <button
                        className="btn-secondary"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={isDangerous ? 'btn-danger' : 'btn-primary'}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
