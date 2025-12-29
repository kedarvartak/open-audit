import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface CustomScrollbarProps {
    children: React.ReactNode;
    className?: string;
    maxHeight?: string;
}

export const CustomScrollbar: React.FC<CustomScrollbarProps> = ({
    children,
    className = '',
    maxHeight = '100%'
}) => {
    const { theme } = useTheme();

    return (
        <div
            className={`custom-scrollbar ${theme === 'dark' ? 'dark-scrollbar' : 'light-scrollbar'} ${className}`}
            style={{
                maxHeight,
                overflowY: 'auto',
                overflowX: 'hidden'
            }}
        >
            {children}
        </div>
    );
};
