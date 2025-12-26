import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, MapPin, Briefcase } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { tasksAPI } from '../services/api';
import type { Task } from '../services/api';

export default function TaskDetails() {
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const navigate = useNavigate();
    const { theme } = useTheme();

    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        if (id) {
            fetchTask();
        }
    }, [id]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            const response = await tasksAPI.getTask(id!);
            setTask(response.data);
        } catch (error) {
            console.error('Failed to fetch task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!id) return;

        try {
            setAccepting(true);
            await tasksAPI.acceptTask(id);
            alert('Task accepted successfully!');
            fetchTask();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to accept task');
        } finally {
            setAccepting(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium text-xl`}>
                    Loading task...
                </div>
            </DashboardLayout>
        );
    }

    if (!task) {
        return (
            <DashboardLayout>
                <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium text-xl`}>
                    Task not found
                </div>
            </DashboardLayout>
        );
    }

    const canAccept = userRole === 'WORKER' && task.status === 'OPEN' && task.client.id !== userId;
    const isMyTask = task.client.id === userId || task.worker?.id === userId;

    return (
        <DashboardLayout>
            <div className="p-8 space-y-6">
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'} transition-colors`}
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Back to Dashboard</span>
                </button>

                <div className={`rounded-2xl border p-8 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-start justify-between mb-6">
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
                            <h1 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                {task.title}
                            </h1>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Budget</p>
                            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                                Rs.{task.budget}
                            </p>
                        </div>
                    </div>

                    <div className={`mb-6 pb-6 border-b ${theme === 'dark' ? 'border-slate-600' : 'border-slate-200'}`}>
                        <h2 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                            Description
                        </h2>
                        <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                            {task.description}
                        </p>
                    </div>

                    {task.locationName && (
                        <div className={`mb-6 pb-6 border-b ${theme === 'dark' ? 'border-slate-600' : 'border-slate-200'}`}>
                            <h2 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                Location
                            </h2>
                            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                <MapPin size={18} />
                                <span>{task.locationName}</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'}`}>
                                    <User size={16} className="text-white" />
                                </div>
                                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Client
                                </h3>
                            </div>
                            <p className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
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
                            <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-green-600' : 'bg-green-500'}`}>
                                        <Briefcase size={16} className="text-white" />
                                    </div>
                                    <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Worker
                                    </h3>
                                </div>
                                <p className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
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

                    <div className={`flex items-center gap-2 text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Calendar size={16} />
                        <span>Posted on {formatDate(task.createdAt)}</span>
                    </div>

                    {canAccept && (
                        <Button
                            onClick={handleAccept}
                            disabled={accepting}
                            className="w-full"
                        >
                            {accepting ? 'Accepting...' : 'Accept Task'}
                        </Button>
                    )}

                    {isMyTask && task.status === 'ACCEPTED' && task.worker?.id === userId && (
                        <Button
                            onClick={() => navigate(`/tasks/${id}/work`)}
                            className="w-full"
                        >
                            Start Work
                        </Button>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
