import { useState, useEffect } from 'react';
import { X, Calendar, File, Trash2, ChevronLeft, ChevronRight, Navigation, MapPin, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { tasksAPI } from '../../services/api';
import type { Task } from '../../services/api';
import { useLocationTracking } from '../../hooks/useLocationTracking';

interface TaskWorkspaceModalProps {
    taskId: string;
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated?: () => void;
}

export const TaskWorkspaceModal = ({ taskId, isOpen, onClose, onTaskUpdated }: TaskWorkspaceModalProps) => {
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [notes, setNotes] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [serverTime, setServerTime] = useState<Date | null>(null);
    const { theme } = useTheme();

    // Get worker info from localStorage
    const workerId = localStorage.getItem('userId') || '';
    const workerName = localStorage.getItem('userName') || 'Worker';

    // Location tracking hook - only active when EN_ROUTE
    const locationTracking = useLocationTracking({
        taskId,
        workerId,
        workerName,
        isTracking: task?.status === 'EN_ROUTE',
        updateIntervalMs: 5000, // Update every 5 seconds
    });

    useEffect(() => {
        if (isOpen && taskId) {
            fetchTask();
            fetchServerTime();
        }
    }, [isOpen, taskId]);

    // Update server time every minute to keep it in sync
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            fetchServerTime();
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [isOpen]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            const response = await tasksAPI.getTask(taskId);
            setTask(response.data);
        } catch (error) {
            console.error('Failed to fetch task:', error);
            toast.error('Failed to load task');
        } finally {
            setLoading(false);
        }
    };

    const fetchServerTime = async () => {
        try {
            const response = await fetch('http://localhost:3001/v0/server-time');
            const data = await response.json();
            setServerTime(new Date(data.serverTime));
        } catch (error) {
            console.error('Failed to fetch server time:', error);
            // Fallback to current time if server time fetch fails
            setServerTime(new Date());
        }
    };

    const canStartTask = () => {
        if (!task?.deadline || !serverTime) return false;
        const deadlineTime = new Date(task.deadline);
        return serverTime >= deadlineTime;
    };

    const getTimeUntilStart = () => {
        if (!task?.deadline || !serverTime) return '';
        const deadlineTime = new Date(task.deadline);
        const diff = deadlineTime.getTime() - serverTime.getTime();

        if (diff <= 0) return '';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `Available in ${hours}h ${minutes}m`;
        }
        return `Available in ${minutes}m`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateStr} at ${timeStr}`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles([...files, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleStartJourney = async () => {
        try {
            // Get current location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        try {
                            await tasksAPI.startJourney(
                                taskId,
                                position.coords.latitude,
                                position.coords.longitude
                            );
                            toast.success('Journey started! The client has been notified.');
                            fetchTask();
                            onTaskUpdated?.();
                        } catch (error: any) {
                            toast.error(error.response?.data?.message || 'Failed to start journey');
                        }
                    },
                    async () => {
                        // Location denied, still allow starting journey without coords
                        try {
                            await tasksAPI.startJourney(taskId);
                            toast.success('Journey started! The client has been notified.');
                            fetchTask();
                            onTaskUpdated?.();
                        } catch (error: any) {
                            toast.error(error.response?.data?.message || 'Failed to start journey');
                        }
                    }
                );
            } else {
                // No geolocation, start without coords
                await tasksAPI.startJourney(taskId);
                toast.success('Journey started! The client has been notified.');
                fetchTask();
                onTaskUpdated?.();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to start journey');
        }
    };

    const handleStartWork = async () => {
        try {
            await tasksAPI.startWork(taskId, new FormData());
            toast.success('Work started! You can now upload your proof.');
            fetchTask();
            onTaskUpdated?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to start work');
        }
    };

    const handleSubmit = async () => {
        if (files.length === 0) {
            toast.error('Please upload at least one file as proof of work');
            return;
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            files.forEach((file) => {
                formData.append('files', file);
            });
            formData.append('notes', notes);

            await tasksAPI.submitWork(taskId, formData);
            toast.success('Work submitted successfully! The client will review it shortly.');
            onClose();
            onTaskUpdated?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit work');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div
                className={`w-full max-w-4xl rounded-lg shadow-2xl my-4 max-h-[90vh] flex flex-col ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                    <h2 className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        Task Workspace
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
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${task.status === 'ACCEPTED' ? 'bg-[#464ace] text-white' :
                                        task.status === 'EN_ROUTE' ? 'bg-orange-500 text-white' :
                                            task.status === 'ARRIVED' ? 'bg-teal-500 text-white' :
                                                task.status === 'IN_PROGRESS' ? 'bg-purple-500 text-white' :
                                                    task.status === 'SUBMITTED' ? 'bg-amber-400 text-slate-900' :
                                                        'bg-slate-500 text-white'
                                        }`}>
                                        {task.status === 'EN_ROUTE' ? '🚗 EN ROUTE' :
                                            task.status === 'ARRIVED' ? '📍 ARRIVED' :
                                                task.status}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">
                                        {task.category.toUpperCase()}
                                    </span>
                                </div>
                                <span className="px-2.5 py-1 rounded text-sm font-semibold bg-emerald-500 text-white">
                                    ₹{task.budget.toLocaleString()}
                                </span>
                            </div>

                            {/* Title with Start Work Button */}
                            <div className="flex items-center justify-between gap-4">
                                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {task.title}
                                </h1>
                                {/* ACCEPTED: Show 'I'm On My Way' button */}
                                {task.status === 'ACCEPTED' && (
                                    <div className="flex items-center gap-2">
                                        {!canStartTask() && getTimeUntilStart() && (
                                            <span className={`text-xs font-medium px-2 py-1 rounded ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {getTimeUntilStart()}
                                            </span>
                                        )}
                                        <Button
                                            onClick={handleStartJourney}
                                            disabled={!canStartTask()}
                                            className={`flex-shrink-0 flex items-center gap-2 ${!canStartTask()
                                                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                                : 'bg-orange-500 hover:bg-orange-600'
                                                } text-white`}
                                        >
                                            <Navigation size={16} />
                                            I'm On My Way
                                        </Button>
                                    </div>
                                )}
                                {/* EN_ROUTE: Show tracking status indicator */}
                                {task.status === 'EN_ROUTE' && (
                                    <div className="flex items-center gap-3">
                                        {/* Live tracking indicator */}
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                                            <div className="relative">
                                                <Radio size={14} className="text-orange-500" />
                                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                                            </div>
                                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-orange-400' : 'text-orange-700'}`}>
                                                {locationTracking.isTracking ? 'Sharing location' : 'Traveling...'}
                                            </span>
                                        </div>

                                        {/* Error indicator if location fails */}
                                        {locationTracking.error && (
                                            <span className="text-xs text-red-500">
                                                ({locationTracking.error})
                                            </span>
                                        )}
                                    </div>
                                )}
                                {/* ARRIVED: Show 'Start Work' button */}
                                {task.status === 'ARRIVED' && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={handleStartWork}
                                            className="flex-shrink-0 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                                        >
                                            <MapPin size={16} />
                                            Start Work
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                {task.description}
                            </p>

                            {/* Location & Scheduled Deadline - Single Row */}
                            <div className="flex gap-3">
                                {/* Location Section */}
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
                                    <div className="p-3 rounded-lg bg-[#464ace] flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-white" />
                                            <div>
                                                <p className="text-xs font-medium text-white/80 whitespace-nowrap">
                                                    Scheduled Deadline
                                                </p>
                                                <p className="text-sm font-semibold text-white whitespace-nowrap">
                                                    {formatDateTime(task.deadline)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className={`border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`} />

                            {/* Client Info Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#464ace] text-white">
                                        {task.client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                            {task.client.name}
                                        </p>
                                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Client</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <Calendar size={14} />
                                    <span>{formatDate(task.createdAt)}</span>
                                </div>
                            </div>



                            {task.status === 'IN_PROGRESS' && (
                                <>
                                    <div className={`border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`} />

                                    {/* Upload Section */}
                                    <div className="space-y-4">
                                        <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                            Upload Proof of Work
                                        </h2>

                                        {/* Upload Area */}
                                        <div className={`border-2 border-dashed rounded-xl p-6 ${theme === 'dark'
                                            ? 'border-slate-600 bg-slate-800/30'
                                            : 'border-slate-300 bg-slate-50'
                                            }`}>
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="mb-4 text-[#464ace]">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.9">
                                                        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                                    </svg>
                                                </div>
                                                <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    Drag your file(s) to start uploading
                                                </p>
                                                <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    OR
                                                </p>
                                                <label className="cursor-pointer">
                                                    <span className="px-4 py-2 text-sm font-medium text-[#464ace] border border-[#464ace] rounded-md hover:bg-[#464ace]/10 transition-colors">
                                                        Browse files
                                                    </span>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        onChange={handleFileChange}
                                                        accept="image/*,video/*,application/pdf"
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Supported: Images, Videos, PDFs (Max 10MB each)
                                        </p>

                                        {/* Uploaded Files List */}
                                        {files.length > 0 && (
                                            <div className="space-y-2">
                                                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                    Uploaded Files ({files.length})
                                                </p>
                                                {files.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'dark'
                                                            ? 'bg-slate-800 border-slate-700'
                                                            : 'bg-white border-slate-200'
                                                            }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                                            <File size={20} className="text-[#464ace]" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                                                {file.name}
                                                            </p>
                                                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => removeFile(index)}
                                                            className="p-1.5 rounded-full hover:bg-red-500/10 transition-colors"
                                                        >
                                                            <Trash2 size={18} className="text-red-500" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes Section */}
                                    <div className="space-y-2">
                                        <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Additional Notes (Optional)
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add any notes or comments about the completed work..."
                                            rows={3}
                                            className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#464ace] transition-all resize-none ${theme === 'dark'
                                                ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500'
                                                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                                                }`}
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={submitting || files.length === 0}
                                        className="w-full"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Work for Review'}
                                    </Button>
                                </>
                            )}

                            {task.status === 'SUBMITTED' && (
                                <>
                                    <div className={`border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`} />
                                    <div className={`p-6 rounded-lg text-center ${theme === 'dark' ? 'bg-purple-900/20 border border-purple-800/30' : 'bg-purple-50 border border-purple-200'}`}>
                                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${theme === 'dark' ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                        <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                            Work Submitted
                                        </h2>
                                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Your work has been submitted for review. The client will review it shortly.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
