import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useTheme } from '../contexts/ThemeContext';
import { tasksAPI } from '../services/api';
import type { Task } from '../services/api';

export default function MyTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
    const { theme } = useTheme();
    const navigate = useNavigate();

    const userRole = localStorage.getItem('userRole');

    useEffect(() => {
        fetchMyTasks();
    }, []);

    const fetchMyTasks = async () => {
        try {
            setLoading(true);
            const response = await tasksAPI.getMyTasks(userRole?.toLowerCase() as 'client' | 'worker');
            setTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN':
                return 'bg-amber-400 text-slate-900';
            case 'ACCEPTED':
                return 'bg-[#464ace] text-white';
            case 'EN_ROUTE':
                return 'bg-orange-500 text-white';
            case 'ARRIVED':
                return 'bg-teal-500 text-white';
            case 'IN_PROGRESS':
                return 'bg-purple-500 text-white';
            case 'SUBMITTED':
                return 'bg-purple-500 text-white';
            case 'COMPLETED':
            case 'PAID':
                return 'bg-emerald-500 text-white';
            case 'DISPUTED':
                return 'bg-red-500 text-white';
            default:
                return 'bg-slate-500 text-white';
        }
    };

    const getTimeSince = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";

        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";

        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";

        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";

        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";

        return "Just now";
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'active') {
            return ['OPEN', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED'].includes(task.status);
        }
        if (filter === 'completed') {
            return ['COMPLETED', 'PAID'].includes(task.status);
        }
        return true;
    });

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-64">
                    <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Loading tasks...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-8 space-y-6 min-h-full">
                <div>
                    <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        Team Tasks
                    </h1>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {userRole === 'CLIENT' ? 'Tasks you have posted' : 'View and manage your team\'s tasks'}
                    </p>
                </div>

                {/* Filter Tabs - Brand Blue */}
                <div className="flex gap-2">
                    {[
                        { value: 'all', label: 'ALL TASKS' },
                        { value: 'active', label: 'ACTIVE' },
                        { value: 'completed', label: 'COMPLETED' }
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value as any)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === tab.value
                                ? 'bg-[#464ace] text-white'
                                : theme === 'dark'
                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tasks Grid - Same as Dashboard */}
                {filteredTasks.length === 0 ? (
                    <div className={`flex-1 flex items-center justify-center rounded-md border ${theme === 'dark'
                        ? 'bg-slate-700/50 border-slate-600'
                        : 'bg-slate-200 border-slate-300'
                        }`}>
                        <div className="text-center py-12">
                            <p className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                No tasks found
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredTasks.map((task) => (
                            <button
                                key={task.id}
                                onClick={() => navigate(`/tasks/${task.id}/verify`)}
                                className="block text-left w-full"
                            >
                                <div className={`rounded-lg overflow-hidden ${theme === 'dark'
                                    ? 'bg-slate-900'
                                    : 'bg-slate-200'
                                    }`}>

                                    {/* Image Banner */}
                                    <div className="p-3">
                                        <div className={`w-full aspect-video overflow-hidden rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                            {task.beforeImages?.length > 0 ? (
                                                <img
                                                    src={task.beforeImages[0]}
                                                    alt={task.title}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <svg width="48" height="36" viewBox="0 0 50 39" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.2">
                                                        <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" fill="#007AFF" />
                                                        <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" fill="#312ECB" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-4">
                                        {/* Title with Budget */}
                                        <div className="mb-3">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <h3 className={`text-base font-bold leading-snug line-clamp-1 ${theme === 'dark'
                                                    ? 'text-slate-100'
                                                    : 'text-slate-900'
                                                    }`}>
                                                    {task.title}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500 text-white">
                                                    ₹{task.budget.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="mb-4">
                                            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {task.description && task.description.length > 100
                                                    ? `${task.description.slice(0, 100)}...`
                                                    : task.description}
                                            </p>
                                        </div>

                                        {/* Status, Category & Role Chips */}
                                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(task.status)}`}>
                                                {task.status}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">
                                                {task.category.toUpperCase()}
                                            </span>
                                            {/* Role-specific chip */}
                                            {userRole === 'WORKER' && task.status === 'ACCEPTED' && (
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#464ace] text-white">
                                                    Start Work
                                                </span>
                                            )}
                                            {userRole === 'WORKER' && task.status === 'IN_PROGRESS' && (
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500 text-white">
                                                    In Progress
                                                </span>
                                            )}
                                            {task.deadline && (
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#464ace] text-white">
                                                    {formatTime(task.deadline)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Footer with Avatar */}
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-[#464ace] text-white">
                                                {userRole === 'CLIENT'
                                                    ? (task.worker?.name?.charAt(0).toUpperCase() || '?')
                                                    : (task.client?.name?.charAt(0).toUpperCase() || '?')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-medium truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                    {userRole === 'CLIENT'
                                                        ? (task.worker?.name || 'Not assigned')
                                                        : (task.client?.name || 'Unknown Client')}
                                                </p>
                                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                                    {getTimeSince(task.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
