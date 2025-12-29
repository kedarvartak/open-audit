import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { tasksAPI } from '../services/api';
import type { Task } from '../services/api';
import { LiveLocationMap } from '../components/tracking/LiveLocationMap';
import { TaskWorkspaceModal } from '../components/modals/TaskWorkspaceModal';

export default function MyTaskDetails() {
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
    const [imageViewerOpen, setImageViewerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const navigate = useNavigate();
    const { theme } = useTheme();

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
            toast.error('Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateStr} at ${timeStr}`;
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { bg: string; text: string; label: string }> = {
            'OPEN': { bg: 'bg-amber-400', text: 'text-slate-900', label: 'OPEN' },
            'ACCEPTED': { bg: 'bg-[#464ace]', text: 'text-white', label: 'ACCEPTED' },
            'EN_ROUTE': { bg: 'bg-amber-400', text: 'text-slate-900', label: 'EN ROUTE' },
            'ARRIVED': { bg: 'bg-teal-500', text: 'text-white', label: 'ARRIVED' },
            'IN_PROGRESS': { bg: 'bg-purple-500', text: 'text-white', label: 'IN PROGRESS' },
            'SUBMITTED': { bg: 'bg-amber-400', text: 'text-slate-900', label: 'SUBMITTED' },
            'VERIFIED': { bg: 'bg-emerald-500', text: 'text-white', label: 'VERIFIED' },
            'PAID': { bg: 'bg-green-600', text: 'text-white', label: 'COMPLETED' },
            'DISPUTED': { bg: 'bg-red-500', text: 'text-white', label: 'DISPUTED' },
        };
        return configs[status] || { bg: 'bg-slate-500', text: 'text-white', label: status };
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-full">
                    <div className="flex flex-col items-center gap-4">
                        <div className={`w-10 h-10 border-3 border-t-[#464ace] rounded-full animate-spin ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}></div>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Loading...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!task) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                        <p className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Task not found</p>
                        <Button onClick={() => navigate('/my-tasks')}>Back to My Tasks</Button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const isClient = task.client.id === userId;
    const isWorker = task.worker?.id === userId;
    const statusConfig = getStatusConfig(task.status);
    const canOpenWorkspace = isWorker && ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(task.status);
    const hasLocation = task.locationLat && task.locationLng;

    return (
        <DashboardLayout>
            <div className="h-full flex relative">
                {/* Map - Full Background */}
                <div className="flex-1 h-full">
                    {hasLocation ? (
                        task.status === 'EN_ROUTE' && task.worker && isClient ? (
                            <LiveLocationMap
                                taskId={id!}
                                destinationLat={task.locationLat!}
                                destinationLng={task.locationLng!}
                                destinationName={task.locationName}
                                geofenceRadius={task.locationRadius || 100}
                                fullHeight={true}
                                onArrival={() => {
                                    toast.success('Worker has arrived!');
                                    fetchTask();
                                }}
                            />
                        ) : (
                            <iframe
                                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${task.locationLat},${task.locationLng}&zoom=15`}
                                className="w-full h-full border-0"
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        )
                    ) : (
                        <div className={`h-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <div className="text-center">
                                <MapPin size={48} className={`mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    No location specified
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Back Button - Floating on Map */}
                <button
                    onClick={() => navigate('/my-tasks')}
                    className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-sm shadow-lg transition-colors ${theme === 'dark'
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                >
                    <ArrowLeft size={16} />
                    <span className="text-sm font-medium">Back</span>
                </button>

                {/* Right Panel */}
                <div className={`w-[380px] h-full flex flex-col shadow-xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                    {/* Panel Header */}
                    <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h1 className={`text-lg font-bold truncate ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {task.title}
                                </h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                                        {statusConfig.label}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-slate-500 text-white">
                                        {task.category.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-emerald-500 text-white">
                                Rs.{task.budget.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Panel Content - Scrollable Sections */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Description Section */}
                        <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                            <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold bg-amber-400 text-slate-900 mb-3">
                                DESCRIPTION
                            </span>
                            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                {task.description}
                            </p>
                        </div>

                        {/* Schedule Section */}
                        {task.deadline && (
                            <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold bg-red-500 text-white mb-3">
                                    SCHEDULE
                                </span>
                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                    {formatDateTime(task.deadline)}
                                </p>
                            </div>
                        )}

                        {/* Location Section */}
                        {task.locationName && (
                            <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold bg-[#464ace] text-white mb-3">
                                    LOCATION
                                </span>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.locationName)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-sm transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    <span className="flex-1">{task.locationName}</span>
                                    <ExternalLink size={14} className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />
                                </a>
                            </div>
                        )}

                        {/* Client Section */}
                        <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                            <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold bg-emerald-500 text-white mb-3">
                                CLIENT
                            </span>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#464ace] flex items-center justify-center text-sm font-semibold text-white">
                                    {task.client.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                        {task.client.name}
                                        {isClient && <span className="text-white ml-1">(You)</span>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Worker Section */}
                        <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                            <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold bg-amber-400 text-slate-900 mb-3">
                                WORKER
                            </span>
                            {task.worker ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-semibold text-white">
                                        {task.worker.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                            {task.worker.name}
                                            {isWorker && <span className="text-white ml-1">(You)</span>}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Not assigned yet
                                </p>
                            )}
                        </div>

                        {/* Images Section */}
                        {task.beforeImages && task.beforeImages.length > 0 && (
                            <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                <button
                                    onClick={() => {
                                        setCurrentImageIndex(0);
                                        setImageViewerOpen(true);
                                    }}
                                    className={`flex items-center gap-2 transition-colors ${theme === 'dark' ? 'hover:opacity-80' : 'hover:opacity-80'
                                        }`}
                                >
                                    <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-purple-500 text-white">
                                        IMAGES ({task.beforeImages.length})
                                    </span>
                                    <span className={`text-sm font-medium underline ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                        View images
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Panel Footer - Actions */}
                    <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        {canOpenWorkspace && (
                            <Button
                                onClick={() => setWorkspaceModalOpen(true)}
                                className="w-full"
                            >
                                OPEN WORKSPACE
                            </Button>
                        )}

                        {isWorker && task.status === 'SUBMITTED' && (
                            <div className={`flex items-center gap-2 p-3 rounded-sm ${theme === 'dark' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                                <CheckCircle size={16} className="text-amber-500" />
                                <p className={`text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>Work submitted - awaiting verification</p>
                            </div>
                        )}

                        {isClient && task.status === 'SUBMITTED' && (
                            <Button
                                onClick={() => navigate(`/tasks/${id}/review`)}
                                className="w-full bg-purple-500 hover:bg-purple-600"
                            >
                                Review Submitted Work
                            </Button>
                        )}

                        {['VERIFIED', 'PAID'].includes(task.status) && (
                            <div className={`flex items-center gap-2 p-3 rounded-sm ${theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                                <CheckCircle size={16} className="text-emerald-500" />
                                <p className={`text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>Task completed</p>
                            </div>
                        )}

                        {!canOpenWorkspace && !['SUBMITTED', 'VERIFIED', 'PAID'].includes(task.status) && (
                            <p className={`text-xs text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                No actions available
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Viewer Modal */}
            {imageViewerOpen && task.beforeImages && task.beforeImages.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setImageViewerOpen(false)}>
                    <div className="relative max-w-5xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        {/* Close Button */}
                        <button
                            onClick={() => setImageViewerOpen(false)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        {/* Image */}
                        <div className="relative aspect-video bg-black rounded-sm overflow-hidden">
                            <img
                                src={task.beforeImages[currentImageIndex]}
                                alt={`Image ${currentImageIndex + 1}`}
                                className="w-full h-full object-contain"
                            />

                            {/* Navigation Arrows */}
                            {task.beforeImages.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setCurrentImageIndex(prev => prev === 0 ? task.beforeImages.length - 1 : prev - 1)}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentImageIndex(prev => prev === task.beforeImages.length - 1 ? 0 : prev + 1)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                                    >
                                        <ChevronRight size={24} />
                                    </button>

                                    {/* Image Counter */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-sm text-sm font-medium bg-black/50 text-white">
                                        {currentImageIndex + 1} / {task.beforeImages.length}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Workspace Modal */}
            {workspaceModalOpen && (
                <TaskWorkspaceModal
                    taskId={id!}
                    isOpen={workspaceModalOpen}
                    onClose={() => setWorkspaceModalOpen(false)}
                    onTaskUpdated={fetchTask}
                />
            )}
        </DashboardLayout>
    );
}
