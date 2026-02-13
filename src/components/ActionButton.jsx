import React from 'react';
import { Edit2, Trash2, Edit, Trash } from 'lucide-react';
import './ActionButton.css';

/**
 * ActionButton component for consistent Edit/Delete actions across the app.
 * Follows the "delicate yet apparent" premium style.
 */
const ActionButton = ({ variant = 'edit', onClick, tooltip, size = 20, useAltIcon = false }) => {
    // Select Icon based on variant
    let Icon;
    if (variant === 'edit') {
        Icon = useAltIcon ? Edit : Edit2;
    } else if (variant === 'delete') {
        Icon = useAltIcon ? Trash : Trash2;
    }

    const variantClass = variant === 'edit' ? 'action-btn-edit' : 'action-btn-delete';

    return (
        <button
            className={`action-btn-shared ${variantClass}`}
            onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(e);
            }}
            data-tooltip={tooltip}
            aria-label={tooltip}
        >
            <Icon size={size} strokeWidth={2} className="action-btn-icon" />
        </button>
    );
};

export default ActionButton;
