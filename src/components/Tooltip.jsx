import { useState } from 'react';

const Tooltip = ({ content, children, className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);

    if (!content) return children;

    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className="absolute bottom-full mb-2 z-50 px-3 py-1.5 text-xs font-semibold text-gray-800 bg-white/75 backdrop-blur-md rounded-lg shadow-xl border border-white/40 whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 pointer-events-none select-none">
                    {content}
                    {/* Seta do Tooltip (Triângulo CSS) */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white/75" />
                </div>
            )}
        </div>
    );
};

export default Tooltip;
