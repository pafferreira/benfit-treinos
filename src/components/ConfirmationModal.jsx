import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Excluir', cancelText = 'Cancelar', isDangerous = true }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="small"
        >
            <div className="confirmation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', alignItems: 'center', padding: '1rem 0' }}>
                {isDangerous && (
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#DC2626'
                    }}>
                        <AlertTriangle size={24} />
                    </div>
                )}

                <div style={{ color: '#4B5563', lineHeight: '1.5' }}>
                    {message}
                </div>

                <div className="form-actions" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                    <button className="btn-secondary" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button
                        className={isDangerous ? "btn-danger" : "btn-primary"}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={isDangerous ? {
                            backgroundColor: '#EF4444',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '12px',
                            fontWeight: '600',
                            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)'
                        } : {}}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
