import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ChevronRight, ImageIcon, Upload } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { tasksAPI, type Task } from '../services/api';
import toast from 'react-hot-toast';

interface CapturedImage {
    id: string;
    src: string;
    timestamp: Date;
    status: 'pending' | 'analyzing' | 'pass' | 'fail' | 'na';
}

export const WorkVerification = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'before' | 'after'>('after');
    const [submitting, setSubmitting] = useState(false);

    // Fetch task details
    useEffect(() => {
        const fetchTask = async () => {
            if (!id) return;
            try {
                const response = await tasksAPI.getTask(id);
                setTask(response.data);
            } catch (error) {
                console.error('Failed to fetch task:', error);
                toast.error('Failed to load task');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchTask();
    }, [id, navigate]);

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const filesArray = Array.from(files);
        let processedCount = 0;

        filesArray.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const newImage: CapturedImage = {
                    id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    src: event.target?.result as string,
                    timestamp: new Date(),
                    status: 'pending'
                };
                setCapturedImages(prev => {
                    const updated = [...prev, newImage];
                    processedCount++;
                    if (processedCount === filesArray.length) {
                        setViewMode('after');
                        setSelectedImageIndex(updated.length - 1);
                    }
                    return updated;
                });
            };
            reader.readAsDataURL(file);
        });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Remove captured image
    const removeImage = (imageId: string) => {
        setCapturedImages(prev => prev.filter(img => img.id !== imageId));
        if (selectedImageIndex !== null) {
            setSelectedImageIndex(null);
        }
    };

    // Submit work for verification
    const handleSubmitWork = async () => {
        if (capturedImages.length === 0) {
            toast.error('Please upload at least one image');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            for (let i = 0; i < capturedImages.length; i++) {
                const img = capturedImages[i];
                const response = await fetch(img.src);
                const blob = await response.blob();
                formData.append('afterImages', blob, `after_${i}.jpg`);
            }

            await tasksAPI.submitWork(id!, formData);
            toast.success('Work submitted for verification');
            navigate(`/my-tasks/${id}`);
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('Failed to submit work');
        } finally {
            setSubmitting(false);
        }
    };



    const getStatusBadge = (status: CapturedImage['status']) => {
        switch (status) {
            case 'pass': return 'bg-emerald-500 text-white';
            case 'fail': return 'bg-red-500 text-white';
            case 'analyzing': return 'bg-purple-500 text-white';
            case 'na': return 'bg-slate-500 text-white';
            default: return 'bg-amber-400 text-slate-900';
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className={`flex justify-center items-center h-full ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className="animate-pulse">Loading task details...</div>
                </div>
            </DashboardLayout>
        );
    }

    if (!task) {
        return (
            <DashboardLayout>
                <div className={`flex justify-center items-center h-full ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Task not found
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(`/my-tasks/${id}`)}
                            className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className={`text-lg font-semibold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                Work Verification
                            </h1>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                {task.title}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {capturedImages.length} image{capturedImages.length !== 1 ? 's' : ''} uploaded
                        </span>
                        <Button
                            onClick={handleSubmitWork}
                            disabled={capturedImages.length === 0 || submitting}
                            className={`px-6 font-medium tracking-wide ${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {submitting ? 'SUBMITTING...' : 'SUBMIT WORK'}
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Image View - Center */}
                    <div className="flex-1 flex flex-col relative">
                        <div className={`absolute inset-0 flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            {viewMode === 'before' && selectedImageIndex !== null && task?.beforeImages?.[selectedImageIndex] ? (
                                <img
                                    src={task.beforeImages[selectedImageIndex]}
                                    alt="Before"
                                    className="w-full h-full object-contain"
                                />
                            ) : viewMode === 'after' && selectedImageIndex !== null && capturedImages[selectedImageIndex] ? (
                                <img
                                    src={capturedImages[selectedImageIndex].src}
                                    alt="After"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center p-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className={`text-xl font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                                Upload Evidence
                                            </h3>
                                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Upload clear photos of the completed work to verify task completion.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 justify-center">
                                            <Button
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                            >

                                                UPLOAD FILES
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>

                    {/* Right Panel - Sidebar */}
                    <div className={`w-96 flex flex-col border-l ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                        {/* Before Images */}
                        <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200 dark:border-slate-700">
                            <div className="px-6 pt-6 pb-2">
                                <span className="inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-900 mb-2">
                                    REFERENCE
                                </span>
                                <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {task.beforeImages?.length || 0} Images
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
                                {task.beforeImages && task.beforeImages.length > 0 ? (
                                    task.beforeImages.map((img, index) => (
                                        <div
                                            key={`before-${index}`}
                                            onClick={() => {
                                                if (viewMode === 'before' && selectedImageIndex === index) {
                                                    setSelectedImageIndex(null);
                                                } else {
                                                    setViewMode('before');
                                                    setSelectedImageIndex(index);
                                                }
                                            }}
                                            className={`group flex items-center gap-4 p-2 rounded-lg cursor-pointer transition-all border ${viewMode === 'before' && selectedImageIndex === index
                                                ? theme === 'dark' ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-indigo-500 bg-indigo-50'
                                                : theme === 'dark' ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="w-16 h-16 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                                <img
                                                    src={img}
                                                    alt={`Before ${index + 1}`}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                                    Image {index + 1}
                                                </p>
                                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Original State
                                                </p>
                                            </div>
                                            <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                        </div>
                                    ))
                                ) : (
                                    <div className={`text-center py-8 border-2 border-dashed rounded-lg ${theme === 'dark' ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                                        <p className="text-sm">No reference images</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* After Images */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-6 pt-6 pb-2">
                                <span className="inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500 text-white mb-2">
                                    VERIFICATION
                                </span>
                                <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {capturedImages.length} Uploaded
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
                                {capturedImages.length > 0 ? (
                                    capturedImages.map((img, index) => (
                                        <div
                                            key={img.id}
                                            onClick={() => {
                                                setViewMode('after');
                                                setSelectedImageIndex(index);
                                            }}
                                            className={`group flex items-center gap-4 p-2 rounded-lg cursor-pointer transition-all border ${viewMode === 'after' && selectedImageIndex === index
                                                ? theme === 'dark' ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-indigo-500 bg-indigo-50'
                                                : theme === 'dark' ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="w-16 h-16 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                                <img
                                                    src={img.src}
                                                    alt={`Uploaded ${index + 1}`}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                                        Image {index + 1}
                                                    </p>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(img.status)}`}>
                                                        {img.status.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeImage(img.id);
                                                }}
                                                className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className={`flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg ${theme === 'dark' ? 'border-slate-700 text-slate-600' : 'border-slate-100 text-slate-400'}`}>
                                        <ImageIcon size={24} className="mb-2 opacity-50" />
                                        <p className="text-sm">No images uploaded</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
