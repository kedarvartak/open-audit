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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className={`relative w-full max-w-5xl flex flex-col rounded-sm shadow-2xl my-4 max-h-[90vh] ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                    <h2 className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors flex-shrink-0 ${theme === 'dark'
                            ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                            : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - scrollable but allows dropdown overflow */}
                <div className="p-4 sm:p-6 overflow-y-auto overflow-x-visible flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};
