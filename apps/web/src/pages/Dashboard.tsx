import { useEffect, useState } from 'react';
import { Search, Plus, MoreVertical, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { Modal } from '../components/ui/Modal';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { useTheme } from '../contexts/ThemeContext';

interface Project {
    id: string;
    title: string;
    description: string;
    contractAddress: string;
    organizer: {
        name: string;
    };
    createdAt: string;
    updatedAt: string;
    milestones?: Array<{
        status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
    }>;
}

export const Dashboard = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBy, setFilterBy] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { theme } = useTheme();

    const fetchProjects = async () => {
        try {
            const response = await axios.get('http://localhost:3000/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    // Filter and sort projects
    const filteredProjects = projects
        .filter(project => {
            const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.description?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else if (sortBy === 'oldest') {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else if (sortBy === 'updated') {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            return 0;
        });

    const getStatusCounts = (project: Project) => {
        const milestones = project.milestones || [];
        return {
            pending: milestones.filter(m => m.status === 'PENDING').length,
            inProgress: milestones.filter(m => m.status === 'IN_PROGRESS').length,
            completed: milestones.filter(m => m.status === 'COMPLETED').length,
        };
    };

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
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
    ];

    const sortOptions = [
        { value: 'newest', label: 'Sort By: Newest' },
        { value: 'oldest', label: 'Sort By: Oldest' },
        { value: 'updated', label: 'Sort By: Recently Updated' },
    ];

    const handleCreateSuccess = () => {
        fetchProjects(); // Refresh the projects list
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
                                className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${theme === 'dark'
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
                    Showing {filteredProjects.length} of {projects.length} Projects
                </p>

                {/* Projects Grid or Empty State */}
                {filteredProjects.length === 0 ? (
                    <div className={`flex-1 flex items-center justify-center rounded-2xl border ${theme === 'dark'
                        ? 'bg-slate-700/50 border-slate-600'
                        : 'bg-slate-100 border-slate-200'
                        }`}>
                        <div className="text-center">
                            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                No projects found.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProjects.map((project) => {
                            const statusCounts = getStatusCounts(project);
                            return (
                                <Link
                                    key={project.id}
                                    to={`/projects/${project.id}`}
                                    className="block group"
                                >
                                    <div className={`rounded-2xl border p-6 hover:shadow-lg transition-all duration-200 ${theme === 'dark'
                                        ? 'bg-slate-700 border-slate-600 hover:border-blue-500'
                                        : 'bg-white border-slate-200 hover:border-blue-400'
                                        }`}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme === 'dark'
                                                ? 'bg-blue-600/20 text-blue-400'
                                                : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                <FileText size={20} />
                                            </div>
                                            <button className={`p-1 rounded-lg transition-colors ${theme === 'dark'
                                                ? 'hover:bg-slate-600 text-slate-400'
                                                : 'hover:bg-slate-100 text-slate-500'
                                                }`}>
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>

                                        <h3 className={`text-lg font-bold mb-2 transition-colors ${theme === 'dark'
                                            ? 'text-slate-100 group-hover:text-blue-400'
                                            : 'text-slate-900 group-hover:text-blue-600'
                                            }`}>
                                            {project.title}
                                        </h3>

                                        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Last Updated<br />
                                            <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {getTimeSince(project.updatedAt)}
                                            </span>
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${theme === 'dark'
                                                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                                                : 'bg-green-100 text-green-700 border border-green-200'
                                                }`}>
                                                PENDING: {statusCounts.pending}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${theme === 'dark'
                                                ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                                                : 'bg-red-100 text-red-700 border border-red-200'
                                                }`}>
                                                PROGRESS: {statusCounts.inProgress}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${theme === 'dark'
                                                ? 'bg-orange-600/20 text-orange-400 border border-orange-600/30'
                                                : 'bg-orange-100 text-orange-700 border border-orange-200'
                                                }`}>
                                                DONE: {statusCounts.completed}
                                            </span>
                                        </div>

                                        <div className={`pt-4 border-t space-y-1 ${theme === 'dark' ? 'border-slate-600' : 'border-slate-200'}`}>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Created by: <span className={`font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {project.organizer?.name || 'Unknown'}
                                                </span>
                                            </p>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Created on: <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {formatDate(project.createdAt)}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Project"
            >
                <CreateProjectModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleCreateSuccess}
                />
            </Modal>
        </DashboardLayout>
    );
};
