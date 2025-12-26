import { useState, useEffect } from 'react';
import { Briefcase, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { TaskDetailsModal } from '../components/modals/TaskDetailsModal';
import { TaskWorkspaceModal } from '../components/modals/TaskWorkspaceModal';
import { useTheme } from '../contexts/ThemeContext';
import { tasksAPI } from '../services/api';
import type { Task } from '../services/api';

export default function MyTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [workspaceTaskId, setWorkspaceTaskId] = useState<string | null>(null);
    const { theme } = useTheme();

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
                return 'bg-blue-600';
            case 'ACCEPTED':
            case 'IN_PROGRESS':
                return 'bg-yellow-600';
            case 'SUBMITTED':
                return 'bg-purple-600';
            case 'COMPLETED':
            case 'PAID':
                return 'bg-green-600';
            case 'DISPUTED':
                return 'bg-red-600';
            default:
                return 'bg-gray-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OPEN':
                return <FileText size={16} />;
            case 'ACCEPTED':
            case 'IN_PROGRESS':
                return <Clock size={16} />;
            case 'SUBMITTED':
                return <Briefcase size={16} />;
            case 'COMPLETED':
            case 'PAID':
                return <CheckCircle2 size={16} />;
            case 'DISPUTED':
                return <AlertCircle size={16} />;
            default:
                return <FileText size={16} />;
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'active') {
            return ['OPEN', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED'].includes(task.status);
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
            <div className="p-8 space-y-6">
                <div>
                    <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        My Tasks
                    </h1>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {userRole === 'CLIENT' ? 'Tasks you have posted' : 'Tasks you are working on'}
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    {[
                        { value: 'all', label: 'All Tasks' },
                        { value: 'active', label: 'Active' },
                        { value: 'completed', label: 'Completed' }
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value as any)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === tab.value
                                ? theme === 'dark'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-600 text-white'
                                : theme === 'dark'
                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tasks Grid */}
                {filteredTasks.length === 0 ? (
                    <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <p>No tasks found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTasks.map((task) => {
                            const shouldOpenWorkspace = userRole === 'WORKER' && ['ACCEPTED', 'IN_PROGRESS'].includes(task.status);

                            return (
                                <button
                                    key={task.id}
                                    onClick={() => {
                                        if (shouldOpenWorkspace) {
                                            setWorkspaceTaskId(task.id);
                                        } else {
                                            setSelectedTaskId(task.id);
                                        }
                                    }}
                                    className={`block rounded-md border p-6 hover:shadow-lg transition-all duration-200 text-left w-full ${theme === 'dark'
                                        ? 'bg-slate-700 border-slate-600 hover:border-blue-500'
                                        : 'bg-white border-slate-200 hover:border-blue-400'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold text-white ${getStatusColor(task.status)}`}>
                                            {getStatusIcon(task.status)}
                                            {task.status}
                                        </div>
                                        <span className={`text-lg font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                                            Rs.{task.budget}
                                        </span>
                                    </div>

                                    <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                        {task.title}
                                    </h3>

                                    <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {task.description}
                                    </p>

                                    <div className={`pt-4 border-t ${theme === 'dark' ? 'border-slate-600' : 'border-slate-200'}`}>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                                                {userRole === 'CLIENT' ? 'Worker:' : 'Client:'}
                                            </span>
                                            <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {userRole === 'CLIENT'
                                                    ? task.worker?.name || 'Not assigned'
                                                    : task.client.name}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedTaskId && (
                <TaskDetailsModal
                    taskId={selectedTaskId}
                    isOpen={!!selectedTaskId}
                    onClose={() => setSelectedTaskId(null)}
                    onTaskUpdated={fetchMyTasks}
                />
            )}

            {workspaceTaskId && (
                <TaskWorkspaceModal
                    taskId={workspaceTaskId}
                    isOpen={!!workspaceTaskId}
                    onClose={() => setWorkspaceTaskId(null)}
                    onTaskUpdated={fetchMyTasks}
                />
            )}
        </DashboardLayout>
    );
}
