import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Radio, MapPin, Clock, Star, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { tasksAPI } from '../services/api';
import type { Task } from '../services/api';
import { LiveLocationMap } from '../components/tracking/LiveLocationMap';

export default function TaskDetails() {
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
            toast.error('Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!id) return;

        try {
            setAccepting(true);
            await tasksAPI.acceptTask(id);
            toast.success('Task accepted successfully!');
            fetchTask();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to accept task');
        } finally {
            setAccepting(false);
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateStr} at ${timeStr}`;
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

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { bg: string; text: string; label: string }> = {
            'OPEN': { bg: 'bg-amber-400', text: 'text-slate-900', label: 'Open' },
            'ACCEPTED': { bg: 'bg-[#464ace]', text: 'text-white', label: 'Accepted' },
            'EN_ROUTE': { bg: 'bg-orange-500', text: 'text-white', label: '🚗 En Route' },
            'ARRIVED': { bg: 'bg-teal-500', text: 'text-white', label: '📍 Arrived' },
            'IN_PROGRESS': { bg: 'bg-purple-500', text: 'text-white', label: 'In Progress' },
            'SUBMITTED': { bg: 'bg-amber-400', text: 'text-slate-900', label: 'Submitted' },
            'VERIFIED': { bg: 'bg-emerald-500', text: 'text-white', label: 'Verified' },
            'PAID': { bg: 'bg-green-600', text: 'text-white', label: 'Completed' },
            'DISPUTED': { bg: 'bg-red-500', text: 'text-white', label: 'Disputed' },
        };
        return configs[status] || { bg: 'bg-slate-500', text: 'text-white', label: status };
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-screen">
                    <div className="flex flex-col items-center gap-4">
                        <div className={`w-12 h-12 border-4 border-t-[#464ace] rounded-full animate-spin ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}></div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Loading task details...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!task) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-screen">
                    <div className="text-center">
                        <p className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Task not found</p>
                        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const canAccept = userRole === 'WORKER' && task.status === 'OPEN' && task.client.id !== userId;
    const isMyTask = task.client.id === userId || task.worker?.id === userId;
    const statusConfig = getStatusConfig(task.status);

    return (
        <DashboardLayout>
            <div className="min-h-screen">
                {/* Hero Section with Image */}
                <div className="relative">
                    {/* Back Button - Floating */}
                    <button
                        onClick={() => navigate(-1)}
                        className={`absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md transition-all ${theme === 'dark'
                            ? 'bg-slate-900/70 text-slate-200 hover:bg-slate-900/90'
                            : 'bg-white/70 text-slate-700 hover:bg-white/90'
                            }`}
                    >
                        <ArrowLeft size={18} />
                        <span className="font-medium">Back</span>
                    </button>

                    {/* Image Gallery */}
                    <div className={`relative w-full h-[40vh] min-h-[300px] max-h-[500px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        {task.beforeImages && task.beforeImages.length > 0 ? (
                            <>
                                <img
                                    src={task.beforeImages[currentImageIndex]}
                                    alt={`${task.title} - Image ${currentImageIndex + 1}`}
                                    className="w-full h-full object-cover"
                                />

                                {/* Gradient Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-slate-900/90 via-transparent' : 'from-white/90 via-transparent'}`}></div>

                                {/* Navigation Arrows */}
                                {task.beforeImages.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setCurrentImageIndex(prev => prev === 0 ? task.beforeImages.length - 1 : prev - 1)}
                                            className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full backdrop-blur-md transition-all ${theme === 'dark'
                                                ? 'bg-slate-900/60 hover:bg-slate-900/80 text-white'
                                                : 'bg-white/60 hover:bg-white/80 text-slate-700'
                                                }`}
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentImageIndex(prev => prev === task.beforeImages.length - 1 ? 0 : prev + 1)}
                                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full backdrop-blur-md transition-all ${theme === 'dark'
                                                ? 'bg-slate-900/60 hover:bg-slate-900/80 text-white'
                                                : 'bg-white/60 hover:bg-white/80 text-slate-700'
                                                }`}
                                        >
                                            <ChevronRight size={24} />
                                        </button>

                                        {/* Image Counter */}
                                        <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full text-sm font-medium bg-black/50 text-white backdrop-blur-sm">
                                            {currentImageIndex + 1} / {task.beforeImages.length}
                                        </div>

                                        {/* Dots Indicator */}
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                                            {task.beforeImages.map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentImageIndex(index)}
                                                    className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentImageIndex
                                                        ? 'bg-[#464ace] w-6'
                                                        : 'bg-white/60 hover:bg-white/80'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <svg width="120" height="90" viewBox="0 0 50 39" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.15">
                                    <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" fill="#007AFF" />
                                    <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" fill="#312ECB" />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section */}
                <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-10 pb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content - Left Column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Title Card */}
                            <div className={`rounded-xl p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                                {/* Status & Category Tags */}
                                <div className="flex items-center gap-2 flex-wrap mb-4">
                                    <span className={`px-3 py-1 rounded-sm text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                                        {statusConfig.label}
                                    </span>
                                    <span className="px-3 py-1 rounded-sm text-xs font-semibold bg-red-500 text-white">
                                        {task.category.toUpperCase()}
                                    </span>
                                    {task.worker && (
                                        <span className="px-3 py-1 rounded-sm text-xs font-semibold bg-green-600 text-white">
                                            Assigned: {task.worker.name}
                                        </span>
                                    )}
                                </div>

                                {/* Title & Budget */}
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                        {task.title}
                                    </h1>
                                    <div className="flex-shrink-0 text-right">
                                        <p className={`text-xs uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Budget</p>
                                        <p className="text-2xl font-bold text-emerald-500">₹{task.budget.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className={`border-t pt-4 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Description
                                    </h3>
                                    <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                        {task.description}
                                    </p>
                                </div>
                            </div>

                            {/* Live Location Map - Show when worker is EN_ROUTE */}
                            {task.status === 'EN_ROUTE' && task.worker && task.locationLat && task.locationLng && userRole === 'CLIENT' && (
                                <div className={`rounded-xl p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="relative">
                                            <Radio size={20} className="text-orange-500" />
                                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
                                        </div>
                                        <div>
                                            <h3 className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                                Live Tracking
                                            </h3>
                                            <p className={`text-sm ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                                                {task.worker.name} is on the way
                                            </p>
                                        </div>
                                    </div>
                                    <LiveLocationMap
                                        taskId={id!}
                                        destinationLat={task.locationLat}
                                        destinationLng={task.locationLng}
                                        destinationName={task.locationName}
                                        geofenceRadius={task.locationRadius || 100}
                                        onArrival={() => {
                                            toast.success('Worker has arrived at the location!');
                                            fetchTask();
                                        }}
                                    />
                                </div>
                            )}

                            {/* Location Card */}
                            {task.locationName && (
                                <div className={`rounded-xl p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                                    <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Location
                                    </h3>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.locationName)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'}`}>
                                            <MapPin size={24} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                                {task.locationName}
                                            </p>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                Click to open in Google Maps
                                            </p>
                                        </div>
                                        <ExternalLink size={18} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Sidebar - Right Column */}
                        <div className="space-y-6">
                            {/* Action Card */}
                            <div className={`rounded-xl p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                                {/* Deadline */}
                                {task.deadline && (
                                    <div className={`flex items-start gap-4 pb-4 mb-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                                        <div className="w-12 h-12 rounded-lg bg-[#464ace] flex items-center justify-center">
                                            <Clock size={22} className="text-white" />
                                        </div>
                                        <div>
                                            <p className={`text-xs uppercase tracking-wide ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                Scheduled For
                                            </p>
                                            <p className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                                {formatDateTime(task.deadline)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Accept Button */}
                                {canAccept && (
                                    <Button
                                        onClick={handleAccept}
                                        disabled={accepting}
                                        className="w-full bg-amber-500 hover:bg-amber-600"
                                    >
                                        {accepting ? 'Accepting...' : 'Accept Task'}
                                    </Button>
                                )}

                                {/* Start Work Button */}
                                {isMyTask && task.status === 'ACCEPTED' && task.worker?.id === userId && (
                                    <Button
                                        onClick={() => navigate(`/tasks/${id}/work`)}
                                        className="w-full"
                                    >
                                        Start Work
                                    </Button>
                                )}

                                {/* Open Workspace */}
                                {isMyTask && ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED'].includes(task.status) && task.worker?.id === userId && (
                                    <Button
                                        onClick={() => navigate(`/tasks/${id}/work`)}
                                        className="w-full"
                                    >
                                        Open Workspace
                                    </Button>
                                )}

                                {/* Review Button for Client */}
                                {isMyTask && task.status === 'VERIFIED' && task.client.id === userId && (
                                    <Button
                                        onClick={() => navigate(`/tasks/${id}/review`)}
                                        className="w-full bg-purple-500 hover:bg-purple-600"
                                    >
                                        Review Work
                                    </Button>
                                )}
                            </div>

                            {/* Client Card */}
                            <div className={`rounded-xl p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                                <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Client
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-[#464ace] flex items-center justify-center text-xl font-bold text-white">
                                        {task.client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                            {task.client.name}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {task.client.rating.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Worker Card - if assigned */}
                            {task.worker && (
                                <div className={`rounded-xl p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                                    <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Assigned Worker
                                    </h3>
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-xl font-bold text-white">
                                            {task.worker.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                                {task.worker.name}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {task.worker.rating.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Task Info Card */}
                            <div className={`rounded-xl p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                                <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Task Info
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Posted</span>
                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                            {getTimeSince(task.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Category</span>
                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                            {task.category}
                                        </span>
                                    </div>
                                    {task.locationRadius && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Geofence Radius</span>
                                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                                {task.locationRadius}m
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
