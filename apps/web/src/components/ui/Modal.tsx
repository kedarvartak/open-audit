import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    const { theme } = useTheme();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-md shadow-2xl overflow-visible ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-md transition-colors ${theme === 'dark'
                            ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                            : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-visible">
                    {children}
                </div>
            </div>
        </div>
    );
};
