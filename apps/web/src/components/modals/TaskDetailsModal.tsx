import { useState, useEffect } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { tasksAPI } from '../../services/api';
import type { Task } from '../../services/api';
import { LiveLocationMap } from '../tracking/LiveLocationMap';

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
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateStr} at ${timeStr}`;
    };

    if (!isOpen) return null;

    const canAccept = userRole === 'WORKER' && task?.status === 'OPEN' && task?.client.id !== userId;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div
                className={`w-full max-w-4xl rounded-sm shadow-2xl my-4 max-h-[90vh] flex flex-col ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                    <h2 className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        Task Details
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors flex-shrink-0 ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                            }`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - scrollable */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Loading task...
                        </div>
                    ) : !task ? (
                        <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Task not found
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Image Carousel */}
                            <div className={`relative w-full h-48 sm:h-64 md:h-72 max-h-[40vh] rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                {task.beforeImages && task.beforeImages.length > 0 ? (
                                    <>
                                        <img
                                            src={task.beforeImages[currentImageIndex]}
                                            alt={`${task.title} - Image ${currentImageIndex + 1}`}
                                            className="w-full h-full object-contain"
                                        />

                                        {/* Navigation Arrows */}
                                        {task.beforeImages.length > 1 && (
                                            <>
                                                <button
                                                    onClick={() => setCurrentImageIndex(prev => prev === 0 ? task.beforeImages.length - 1 : prev - 1)}
                                                    className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${theme === 'dark'
                                                        ? 'bg-slate-800/80 hover:bg-slate-700 text-white'
                                                        : 'bg-white/80 hover:bg-white text-slate-700'
                                                        }`}
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>
                                                <button
                                                    onClick={() => setCurrentImageIndex(prev => prev === task.beforeImages.length - 1 ? 0 : prev + 1)}
                                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${theme === 'dark'
                                                        ? 'bg-slate-800/80 hover:bg-slate-700 text-white'
                                                        : 'bg-white/80 hover:bg-white text-slate-700'
                                                        }`}
                                                >
                                                    <ChevronRight size={20} />
                                                </button>

                                                {/* Dots Indicator */}
                                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                    {task.beforeImages.map((_, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => setCurrentImageIndex(index)}
                                                            className={`w-2 h-2 rounded-full transition-all ${index === currentImageIndex
                                                                ? 'bg-[#464ace] w-4'
                                                                : theme === 'dark' ? 'bg-slate-500' : 'bg-slate-300'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Image Counter */}
                                                <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium bg-[#464ace] text-white">
                                                    {currentImageIndex + 1} / {task.beforeImages.length}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg width="64" height="48" viewBox="0 0 50 39" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.2">
                                            <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" fill="#007AFF" />
                                            <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" fill="#312ECB" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Tags & Budget Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-400 text-slate-900">
                                        {task.status}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">
                                        {task.category.toUpperCase()}
                                    </span>
                                    {task.worker && (
                                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-600 text-white">
                                            Assigned: {task.worker.name}
                                        </span>
                                    )}
                                </div>
                                <span className="px-2.5 py-1 rounded text-sm font-semibold bg-emerald-500 text-white">
                                    ₹{task.budget.toLocaleString()}
                                </span>
                            </div>

                            {/* Live Location Map - Show when worker is EN_ROUTE */}
                            {task.status === 'EN_ROUTE' && task.worker && task.locationLat && task.locationLng && userRole === 'CLIENT' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Radio size={16} className="text-orange-500" />
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                                        </div>
                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                                            {task.worker.name} is on the way
                                        </span>
                                    </div>
                                    <LiveLocationMap
                                        taskId={taskId}
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

                            {/* Title with Accept Task Button */}
                            <div className="flex items-center justify-between gap-4">
                                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {task.title}
                                </h1>
                                {canAccept && (
                                    <Button
                                        onClick={handleAccept}
                                        disabled={accepting}
                                        className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold flex-shrink-0"
                                    >
                                        {accepting ? 'ACCEPTING...' : 'ACCEPT'}
                                    </Button>
                                )}
                            </div>

                            {/* Description */}
                            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                {task.description}
                            </p>

                            {/* Location & Scheduled Deadline - Single Row */}
                            <div className="flex gap-3">
                                {/* Location Section - Clickable */}
                                {task.locationName && (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.locationName)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-3 rounded-lg transition-colors flex-1 min-w-0 ${theme === 'dark' ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}
                                    >
                                        <img src="/map.svg" alt="Location" className="w-5 h-5 flex-shrink-0" />
                                        <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                            {task.locationName}
                                        </p>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-auto flex-shrink-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                    </a>
                                )}

                                {/* Scheduled Deadline */}
                                {task.deadline && (
                                    <div className="px-4 py-3 rounded-lg bg-[#464ace] flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-white" />
                                            <p className="text-sm font-bold text-white whitespace-nowrap uppercase tracking-wide">
                                                {formatDateTime(task.deadline)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className={`border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`} />

                            {/* Client & Date Row - Minimalist */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#464ace] text-white">
                                        {task.client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                        {task.client.name}
                                    </p>
                                </div>
                                <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <Calendar size={14} />
                                    <span>{formatDate(task.createdAt)}</span>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
