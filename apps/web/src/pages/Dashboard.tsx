import { useEffect, useState } from 'react';
import { Search, Plus, MoreVertical, Briefcase } from 'lucide-react';
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
            <div className="p-8 space-y-6 h-full flex flex-col">
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
                                    : 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                                    }`}
                            />
                        </div>
                    </div>

                    <Button className="gap-2 shadow-md" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={18} />
                        <span className="font-semibold">CREATE PROJECT</span>
                    </Button>
                </div>

                {/* Results Count */}
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Showing {filteredTasks.length} of {tasks.length} Tasks
                </p>

                {filteredTasks.length === 0 ? (
                    <div className={`flex-1 flex items-center justify-center rounded-md border ${theme === 'dark'
                        ? 'bg-slate-700/50 border-slate-600'
                        : 'bg-slate-100 border-slate-200'
                        }`}>
                        <div className="text-center">
                            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                No tasks found.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTasks.map((task) => {
                            return (
                                <button
                                    key={task.id}
                                    onClick={() => setSelectedTaskId(task.id)}
                                    className="block group text-left w-full"
                                >
                                    <div className={`rounded-md border p-6 hover:shadow-lg transition-all duration-200 ${theme === 'dark'
                                        ? 'bg-slate-700 border-slate-600 hover:border-blue-500'
                                        : 'bg-white border-slate-200 hover:border-blue-400'
                                        }`}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${theme === 'dark'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-blue-500 text-white'
                                                }`}>
                                                <Briefcase size={20} />
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Handle more options
                                                }}
                                                className={`p-1 rounded-md transition-colors ${theme === 'dark'
                                                    ? 'hover:bg-slate-600 text-slate-400'
                                                    : 'hover:bg-slate-100 text-slate-500'
                                                    }`}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>

                                        <h3 className={`text-lg font-bold mb-2 transition-colors ${theme === 'dark'
                                            ? 'text-slate-100 group-hover:text-blue-400'
                                            : 'text-slate-900 group-hover:text-blue-600'
                                            }`}>
                                            {task.title}
                                        </h3>

                                        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {task.description.length > 80 ? task.description.substring(0, 80) + '...' : task.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${theme === 'dark'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-green-500 text-white'
                                                }`}>
                                                Rs.{task.budget}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${theme === 'dark'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-blue-500 text-white'
                                                }`}>
                                                {task.category.toUpperCase()}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${task.status === 'OPEN' ?
                                                theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                                                : theme === 'dark' ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'
                                                }`}>
                                                {task.status}
                                            </span>
                                        </div>

                                        <div className={`pt-4 border-t space-y-1 ${theme === 'dark' ? 'border-slate-600' : 'border-slate-200'}`}>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Posted by: <span className={`font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {task.client?.name || 'Unknown'}
                                                </span>
                                            </p>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {getTimeSince(task.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
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

            {selectedTaskId && (
                <TaskDetailsModal
                    taskId={selectedTaskId}
                    isOpen={!!selectedTaskId}
                    onClose={() => setSelectedTaskId(null)}
                    onTaskUpdated={fetchTasks}
                />
            )}
        </DashboardLayout>
    );
};
