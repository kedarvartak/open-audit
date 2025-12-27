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

export const Dashboard = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBy, setFilterBy] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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

    const filteredTasks = tasks
        .filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.description?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter = filterBy === 'all' ||
                (filterBy === 'active' && task.status === 'OPEN') ||
                (filterBy === 'completed' && task.status === 'PAID');

            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else if (sortBy === 'oldest') {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
    ];

    const sortOptions = [
        { value: 'newest', label: 'Sort By: Newest' },
        { value: 'oldest', label: 'Sort By: Oldest' },
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
            <div className={`p-8 space-y-6 h-full flex flex-col ${theme === 'dark' ? '' : 'bg-slate-50'}`}>
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
                                    : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-500 focus:border-blue-500'
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
                        : 'bg-white border-slate-200'
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
                                <div className={`rounded-lg border p-5 transition-shadow duration-200 ${theme === 'dark'
                                    ? 'bg-slate-900 border-slate-700'
                                    : 'bg-white border-slate-200 shadow-sm'
                                    }`}>

                                    {/* Header with Logo */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme === 'dark'
                                            ? 'bg-slate-800'
                                            : 'bg-slate-100'
                                            }`}>
                                            <svg width="24" height="20" viewBox="0 0 50 39" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" fill="#007AFF" />
                                                <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" fill="#312ECB" />
                                            </svg>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                            className={`p-1.5 rounded-md transition-colors ${theme === 'dark'
                                                ? 'hover:bg-slate-700 text-slate-500'
                                                : 'hover:bg-slate-100 text-slate-400'
                                                }`}
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>

                                    {/* Title */}
                                    <h3 className={`text-base font-semibold mb-2 line-clamp-1 ${theme === 'dark'
                                        ? 'text-slate-100'
                                        : 'text-slate-900'
                                        }`}>
                                        {task.title}
                                    </h3>

                                    {/* Description */}
                                    <p className={`text-sm mb-4 line-clamp-2 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {task.description}
                                    </p>

                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500 text-white">
                                            ₹{task.budget.toLocaleString()}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${task.status === 'OPEN'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-amber-500 text-white'
                                            }`}>
                                            {task.status}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${theme === 'dark'
                                            ? 'bg-[#464ace]/20 text-[#8b94ff]'
                                            : 'bg-[#464ace]/10 text-[#464ace]'
                                            }`}>
                                            {task.category.charAt(0).toUpperCase() + task.category.slice(1).toLowerCase()}
                                        </span>
                                    </div>

                                    {/* Footer */}
                                    <div className={`pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-medium truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                                    {task.client?.name || 'Unknown Client'}
                                                </p>
                                                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                                                    {getTimeSince(task.createdAt)}
                                                </p>
                                            </div>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${theme === 'dark'
                                                ? 'bg-slate-700 text-slate-400'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {task.client?.name?.charAt(0).toUpperCase() || '?'}
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
        </DashboardLayout >
    );
};
