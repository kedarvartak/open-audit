import React from 'react';
import { motion } from 'framer-motion';
import { RippleBackground } from './RippleBackground';
import { useTheme } from '../../contexts/ThemeContext';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
    const { theme } = useTheme();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: 'easeOut' },
        },
    };

    return (
        <div className={`min-h-screen w-full flex ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
            {/* Left Side - Visuals */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-14 text-white overflow-hidden">
                <RippleBackground isDark={theme === 'dark'} />

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="relative z-10"
                >
                    <h2 className="text-2xl font-bold tracking-tight">Open-Audit</h2>
                    <p className="text-white/60 text-xs font-medium mt-1 tracking-wide">Transparent Public Works</p>
                </motion.div>

                {/* Main Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="relative z-10 space-y-4"
                >
                    <p className="text-white/50 text-xs font-medium uppercase tracking-[0.2em]">You can easily</p>
                    <h1 className="text-4xl font-bold leading-[1.15] tracking-tight">
                        Speed up your work<br />with our Web App
                    </h1>
                </motion.div>

                {/* Empty footer space */}
                <div className="relative z-10"></div>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className={`w-full lg:w-1/2 px-16 py-12 flex flex-col justify-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}
            >
                <div className="max-w-md mx-auto w-full space-y-8">
                    <motion.div variants={itemVariants} className="space-y-2">
                        <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} tracking-tight`}>{title}</h2>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        {children}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};
