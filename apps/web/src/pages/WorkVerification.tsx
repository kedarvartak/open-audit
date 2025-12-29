import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ChevronRight, AlertTriangle, ImageIcon } from 'lucide-react';
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
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'before' | 'after'>('after'); // Track which type of image to show
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

    // Initialize camera
    const startCamera = async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Ensure video plays once metadata is loaded
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                };
                setCameraActive(true);
            }
        } catch (error) {
            console.error('Camera error:', error);
            setCameraError('Unable to access camera. Please check permissions or use file upload.');
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setCameraActive(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopCamera();
    }, []);

    // Capture photo from camera
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.9);

            const newImage: CapturedImage = {
                id: `img_${Date.now()}`,
                src: imageData,
                timestamp: new Date(),
                status: 'pending'
            };

            setCapturedImages(prev => {
                const updated = [...prev, newImage];
                // Auto-select the newly captured image
                setViewMode('after');
                setSelectedImageIndex(updated.length - 1);
                return updated;
            });
            toast.success('Image captured');
        }
    };

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
                    // Auto-select the latest uploaded image
                    processedCount++;
                    if (processedCount === filesArray.length) {
                        setViewMode('after');
                        setSelectedImageIndex(updated.length - 1);
                        // Stop camera when uploading files
                        stopCamera();
                    }
                    return updated;
                });
            };
            reader.readAsDataURL(file);
        });

        // Reset input
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
            toast.error('Please capture at least one image');
            return;
        }

        setSubmitting(true);
        try {
            // TODO: Integrate with AI service for image comparison
            // For now, convert images to FormData and submit
            const formData = new FormData();

            // Convert base64 images to blobs and append to FormData
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

    // Format timestamp
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    // Get status badge style
    const getStatusBadge = (status: CapturedImage['status']) => {
        switch (status) {
            case 'pass':
                return 'bg-emerald-500 text-white';
            case 'fail':
                return 'bg-red-500 text-white';
            case 'analyzing':
                return 'bg-amber-400 text-slate-900';
            case 'na':
                return 'bg-slate-500 text-white';
            default:
                return 'bg-slate-400 text-white';
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium text-xl`}>
                    Loading...
                </div>
            </DashboardLayout>
        );
    }

    if (!task) {
        return (
            <DashboardLayout>
                <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium text-xl`}>
                    Task not found
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(`/my-tasks/${id}`)}
                            className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                Work Verification
                            </h1>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                {task.title}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {capturedImages.length} image{capturedImages.length !== 1 ? 's' : ''} captured
                        </span>
                        <Button
                            onClick={handleSubmitWork}
                            disabled={capturedImages.length === 0 || submitting}
                            className="gap-2"
                        >
                            {submitting ? 'SUBMITTING...' : 'SUBMIT WORK'}
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Camera/Upload Section - Center */}
                    <div className="flex-1 flex flex-col">
                        {/* Camera/Image View - Full Container with Dark Background */}
                        <div className="flex-1 relative flex items-center justify-center bg-black">
                            {cameraActive ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-contain"
                                />
                            ) : viewMode === 'before' && selectedImageIndex !== null && task?.beforeImages?.[selectedImageIndex] ? (
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
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                    {cameraError ? (
                                        <div className="text-center p-8">
                                            <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
                                            <p className="text-sm mb-4 text-slate-400">
                                                {cameraError}
                                            </p>
                                            <Button onClick={startCamera} variant="outline">
                                                RETRY CAMERA
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center p-8">
                                            <p className="text-lg font-medium mb-6 text-slate-300">
                                                Capture After Images
                                            </p>
                                            <div className="flex items-center gap-4 justify-center">
                                                <Button onClick={startCamera}>
                                                    START CAMERA
                                                </Button>
                                                <span className="text-sm text-slate-500">or</span>
                                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                                    UPLOAD FILES
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Hidden canvas for capturing */}
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>

                        {/* Camera Controls */}
                        <div className={`flex items-center justify-center gap-4 p-4 border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                            {cameraActive && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={stopCamera}
                                    >
                                        STOP CAMERA
                                    </Button>
                                    <button
                                        onClick={capturePhoto}
                                        className="w-16 h-16 rounded-full bg-[#464ace] hover:bg-[#3d42b8] flex items-center justify-center transition-all active:scale-95"
                                    >
                                        <div className="w-12 h-12 rounded-full border-4 border-white" />
                                    </button>
                                    <Button
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        UPLOAD
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Image Inspection */}
                    <div className={`w-80 flex flex-col border-l ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                        {/* Panel Header */}
                        <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                            <h2 className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                All Inspections
                            </h2>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                Before: {task.beforeImages?.length || 0} images | After: {capturedImages.length} images
                            </p>
                        </div>

                        {/* Before Images Section */}
                        <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                            <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                BEFORE IMAGES
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {task.beforeImages && task.beforeImages.length > 0 ? (
                                    task.beforeImages.map((img, index) => (
                                        <div
                                            key={`before-${index}`}
                                            onClick={() => {
                                                setViewMode('before');
                                                setSelectedImageIndex(index);
                                                stopCamera();
                                            }}
                                            className={`flex items-center gap-3 p-2 rounded-sm cursor-pointer transition-colors border ${viewMode === 'before' && selectedImageIndex === index
                                                ? theme === 'dark' ? 'border-[#464ace] bg-[#464ace]/10' : 'border-[#464ace] bg-[#464ace]/5'
                                                : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <img
                                                src={img}
                                                alt={`Before ${index + 1}`}
                                                className="w-12 h-12 object-cover rounded-sm"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                                    Before Image {index + 1}
                                                </p>
                                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Original
                                                </p>
                                            </div>
                                            <ChevronRight size={16} className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />
                                        </div>
                                    ))
                                ) : (
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        No before images
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* After Images Section */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className={`px-4 py-3 ${theme === 'dark' ? '' : ''}`}>
                                <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    AFTER IMAGES
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 pb-4">
                                {capturedImages.length > 0 ? (
                                    <div className="space-y-2">
                                        {capturedImages.map((img, index) => (
                                            <div
                                                key={img.id}
                                                onClick={() => {
                                                    setViewMode('after');
                                                    setSelectedImageIndex(index);
                                                }}
                                                className={`flex items-center gap-3 p-2 rounded-sm transition-colors cursor-pointer border ${viewMode === 'after' && selectedImageIndex === index
                                                    ? theme === 'dark' ? 'border-[#464ace] bg-[#464ace]/10' : 'border-[#464ace] bg-[#464ace]/5'
                                                    : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <img
                                                    src={img.src}
                                                    alt={`Captured ${index + 1}`}
                                                    className="w-12 h-12 object-cover rounded-sm"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                                        After Image {index + 1}
                                                    </p>
                                                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {formatTime(img.timestamp)}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold ${getStatusBadge(img.status)}`}>
                                                    {img.status.toUpperCase()}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeImage(img.id);
                                                    }}
                                                    className={`p-1 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`flex flex-col items-center justify-center py-8 text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        <ImageIcon size={32} className="mb-2" />
                                        <p className="text-sm">No images captured yet</p>
                                        <p className="text-xs mt-1">Use camera or upload to add images</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Panel Footer */}
                        <div className={`flex gap-2 p-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate(`/my-tasks/${id}`)}
                            >
                                CANCEL
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleSubmitWork}
                                disabled={capturedImages.length === 0 || submitting}
                            >
                                {submitting ? 'SUBMITTING...' : 'SUBMIT'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
