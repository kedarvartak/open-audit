import { useState, useEffect } from 'react';
import { X, User, Calendar, MapPin, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { tasksAPI } from '../../services/api';
import type { Task } from '../../services/api';

interface TaskDetailsModalProps {
    taskId: string;
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated?: () => void;
}

export const TaskDetailsModal = ({ taskId, isOpen, onClose, onTaskUpdated }: TaskDetailsModalProps) => {
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const { theme } = useTheme();

    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        if (isOpen && taskId) {
            fetchTask();
        }
    }, [isOpen, taskId]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            const response = await tasksAPI.getTask(taskId);
            setTask(response.data);
        } catch (error) {
            console.error('Failed to fetch task:', error);
            toast.error('Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        try {
            setAccepting(true);
            await tasksAPI.acceptTask(taskId);
            toast.success('Task accepted successfully!');
            fetchTask();
            onTaskUpdated?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to accept task');
        } finally {
            setAccepting(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    if (!isOpen) return null;

    const canAccept = userRole === 'WORKER' && task?.status === 'OPEN' && task?.client.id !== userId;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-md shadow-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                    <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        Task Details
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Loading task...
                        </div>
                    ) : !task ? (
                        <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Task not found
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`px-3 py-1 rounded text-xs font-semibold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                                            {task.category.toUpperCase()}
                                        </span>
                                        <span className={`px-3 py-1 rounded text-xs font-semibold ${task.status === 'OPEN' ?
                                            theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                                            : theme === 'dark' ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'
                                            }`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    <h1 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                        {task.title}
                                    </h1>
                                </div>
                                <div className="text-right ml-6">
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Budget</p>
                                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                                        Rs.{task.budget}
                                    </p>
                                </div>
                            </div>

                            <div className={`pb-6 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                <h2 className={`text-base font-semibold mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                    Description
                                </h2>
                                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {task.description}
                                </p>
                            </div>

                            {task.locationName && (
                                <div className={`pb-6 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                    <h2 className={`text-base font-semibold mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                        Location
                                    </h2>
                                    <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <MapPin size={18} />
                                        <span>{task.locationName}</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`rounded-md border p-4 ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'}`}>
                                            <User size={16} className="text-white" />
                                        </div>
                                        <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Client
                                        </h3>
                                    </div>
                                    <p className={`text-base font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                        {task.client.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rating:</span>
                                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                            {task.client.rating.toFixed(1)} / 5.0
                                        </span>
                                    </div>
                                </div>

                                {task.worker && (
                                    <div className={`rounded-md border p-4 ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${theme === 'dark' ? 'bg-green-600' : 'bg-green-500'}`}>
                                                <Briefcase size={16} className="text-white" />
                                            </div>
                                            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Worker
                                            </h3>
                                        </div>
                                        <p className={`text-base font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                            {task.worker.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rating:</span>
                                            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                                {task.worker.rating.toFixed(1)} / 5.0
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                <Calendar size={16} />
                                <span>Posted on {formatDate(task.createdAt)}</span>
                            </div>

                            {canAccept && (
                                <div className="pt-4">
                                    <Button
                                        onClick={handleAccept}
                                        disabled={accepting}
                                        className="w-full"
                                    >
                                        {accepting ? 'Accepting...' : 'Accept Task'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
