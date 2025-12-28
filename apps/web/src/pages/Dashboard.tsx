import { useEffect, useState } from 'react';
import { Search, Plus, MoreVertical } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { Modal } from '../components/ui/Modal';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { TaskDetailsModal } from '../components/modals/TaskDetailsModal';
import { useTheme } from '../contexts/ThemeContext';
import { tasksAPI } from '../services/api';
import type { Task } from '../services/api';
import toast from 'react-hot-toast';

export const Dashboard = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBy, setFilterBy] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const { theme } = useTheme();

    const fetchTasks = async () => {
        try {
            const response = await tasksAPI.getMarketplace();
            setTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            await tasksAPI.deleteTask(taskId);
            toast.success('Task deleted successfully');
            fetchTasks();
            setOpenMenuId(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete task');
        }
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setOpenMenuId(null);
    };

    const currentUserId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    const filteredTasks = tasks
        .filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.description?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter = filterBy === 'all' ||
                (filterBy === 'active' && task.status === 'OPEN') ||
                (filterBy === 'completed' && task.status === 'PAID') ||
                (filterBy === 'general' && task.category.toLowerCase() === 'general') ||
                (filterBy === 'design' && task.category.toLowerCase() === 'design') ||
                (filterBy === 'development' && task.category.toLowerCase() === 'development');

            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else if (sortBy === 'oldest') {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else if (sortBy === 'budget-high') {
                return b.budget - a.budget;
            } else if (sortBy === 'budget-low') {
                return a.budget - b.budget;
            }
            return 0;
        });

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const getTimeSince = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 1) return 'today';
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    };

    const filterOptions = [
        { value: 'all', label: 'Show All' },
        { value: 'active', label: 'Active Tasks' },
        { value: 'completed', label: 'Completed Tasks' },
        { value: 'general', label: 'General' },
        { value: 'design', label: 'Design' },
        { value: 'development', label: 'Development' },
    ];

    const sortOptions = [
        { value: 'newest', label: 'Sort By: Newest' },
        { value: 'oldest', label: 'Sort By: Oldest' },
        { value: 'budget-high', label: 'Sort By: Highest Budget' },
        { value: 'budget-low', label: 'Sort By: Lowest Budget' },
    ];

    const handleCreateSuccess = () => {
        fetchTasks();
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium text-xl`}>
                    Loading projects...
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-8 space-y-6 min-h-full flex flex-col">
                {/* Filter Bar */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Dropdown
                            value={filterBy}
                            onChange={setFilterBy}
                            options={filterOptions}
                            className="w-48"
                        />

                        <Dropdown
                            value={sortBy}
                            onChange={setSortBy}
                            options={sortOptions}
                            className="w-64"
                        />

                        <div className="relative flex-1 max-w-md">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${theme === 'dark'
                                    ? 'bg-slate-700 border border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-blue-500'
                                    : 'bg-slate-200 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-500'
                                    }`}
                            />
                        </div>
                    </div>

                    <Button className="gap-2 shadow-md" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={18} />
                        <span className="font-semibold">Create Task</span>
                    </Button>
                </div>

                {/* Results Count */}
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Showing {filteredTasks.length} of {tasks.length} Tasks
                </p>

                {filteredTasks.length === 0 ? (
                    <div className={`flex-1 flex items-center justify-center rounded-md border ${theme === 'dark'
                        ? 'bg-slate-700/50 border-slate-600'
                        : 'bg-slate-200 border-slate-300'
                        }`}>
                        <div className="text-center">
                            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                No tasks found.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredTasks.map((task) => (
                            <button
                                key={task.id}
                                onClick={() => setSelectedTaskId(task.id)}
                                className="block text-left w-full"
                            >
                                <div className={`rounded-lg overflow-hidden ${theme === 'dark'
                                    ? 'bg-slate-900'
                                    : 'bg-slate-200'
                                    }`}>

                                    {/* Image Banner - With Gap */}
                                    <div className="p-3 relative">
                                        <div className={`w-full aspect-video overflow-hidden rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                            {task.beforeImageUrl ? (
                                                <img
                                                    src={task.beforeImageUrl}
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

                                        {/* Three-dot menu for task owner */}
                                        {userRole === 'CLIENT' && task.client.id === currentUserId && task.status === 'OPEN' && (
                                            <div className="absolute top-5 right-5">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === task.id ? null : task.id);
                                                    }}
                                                    className={`p-1.5 rounded-full transition-colors ${theme === 'dark'
                                                        ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                                                        : 'bg-white/80 hover:bg-slate-100 text-slate-600'
                                                        }`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>

                                                {/* Dropdown menu */}
                                                {openMenuId === task.id && (
                                                    <div className={`absolute right-0 mt-2 w-36 rounded-lg shadow-lg ${theme === 'dark'
                                                        ? 'bg-slate-800 border border-slate-700'
                                                        : 'bg-white border border-slate-200'
                                                        } z-10`}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditTask(task);
                                                            }}
                                                            className={`w-full px-4 py-2 text-left text-sm rounded-t-lg transition-colors ${theme === 'dark'
                                                                ? 'hover:bg-slate-700 text-slate-300'
                                                                : 'hover:bg-slate-50 text-slate-700'
                                                                }`}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteTask(task.id);
                                                            }}
                                                            className={`w-full px-4 py-2 text-left text-sm rounded-b-lg transition-colors text-red-500 ${theme === 'dark'
                                                                ? 'hover:bg-slate-700'
                                                                : 'hover:bg-red-50'
                                                                }`}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Content Below Image */}
                                    <div className="p-4">
                                        {/* Title with Budget inline */}
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

                                        {/* Description with better truncation */}
                                        <div className="mb-4">
                                            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {task.description && task.description.length > 100
                                                    ? `${task.description.slice(0, 100)}...`
                                                    : task.description}
                                            </p>
                                        </div>

                                        {/* Status & Category Badges */}
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${task.status === 'OPEN'
                                                ? 'bg-amber-400 text-slate-900'
                                                : 'bg-amber-500 text-white'
                                                }`}>
                                                {task.status}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">
                                                {task.category.toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Footer with Avatar */}
                                        <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${theme === 'dark'
                                                ? 'bg-slate-800 text-slate-400'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {task.client?.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-medium truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                    {task.client?.name || 'Unknown Client'}
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

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Task"
            >
                <CreateProjectModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleCreateSuccess}
                />
            </Modal>


            {
                selectedTaskId && (
                    <TaskDetailsModal
                        taskId={selectedTaskId}
                        isOpen={!!selectedTaskId}
                        onClose={() => setSelectedTaskId(null)}
                        onTaskUpdated={fetchTasks}
                    />
                )
            }

            {editingTask && (
                <Modal
                    isOpen={!!editingTask}
                    onClose={() => setEditingTask(null)}
                    title="Edit Task"
                >
                    <CreateProjectModal
                        onClose={() => setEditingTask(null)}
                        onSuccess={() => {
                            setEditingTask(null);
                            fetchTasks();
                        }}
                        editTask={editingTask}
                    />
                </Modal>
            )}
        </DashboardLayout >
    );
};
