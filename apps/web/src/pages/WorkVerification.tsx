import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ChevronRight, ImageIcon } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { CustomScrollbar } from '../components/ui/CustomScrollbar';
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
    const [viewMode, setViewMode] = useState<'before' | 'after' | 'ai'>('after');
    const [submitting, setSubmitting] = useState(false);
    const [aiResults, setAiResults] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'reference' | 'verification' | 'ai'>('verification');

    // Fetch task details
    useEffect(() => {
        const fetchTask = async () => {
            if (!id) return;
            try {
                const response = await tasksAPI.getTask(id);
                const taskData = response.data;
                setTask(taskData);

                // Load existing AI results if they exist
                if (taskData.aiVerification) {
                    console.log('[WorkVerification] Loading existing AI results');
                    setAiResults(taskData.aiVerification);
                    // Switch to AI view if results exist
                    if (taskData.aiVerification.details?.length > 0) {
                        setViewMode('ai');
                        setSelectedImageIndex(0);
                        setActiveTab('ai');
                    }
                }

                // Load uploaded "after" images if they exist
                // Note: Currently the backend only stores afterImageUrl (single image)
                // For multiple images support, backend would need to store an array
                if (taskData.afterImageUrl) {
                    console.log('[WorkVerification] Loading uploaded after images');
                    // For now, just add the single after image
                    const uploadedImage: CapturedImage = {
                        id: 'uploaded_1',
                        src: taskData.afterImageUrl,
                        timestamp: new Date(taskData.completedAt || new Date()),
                        status: 'pass'
                    };
                    setCapturedImages([uploadedImage]);
                    if (!taskData.aiVerification) {
                        setActiveTab('verification');
                    }
                }
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
        console.log('[WorkVerification] handleSubmitWork called');
        console.log('[WorkVerification] capturedImages:', capturedImages.length);

        if (capturedImages.length === 0) {
            toast.error('Please upload at least one image');
            return;
        }

        // Note: Backend now handles all status transitions automatically

        setSubmitting(true);
        try {
            const formData = new FormData();

            for (let i = 0; i < capturedImages.length; i++) {
                const img = capturedImages[i];
                console.log(`[WorkVerification] Processing image ${i}: ${img.src.substring(0, 50)}...`);

                const response = await fetch(img.src);
                const blob = await response.blob();
                console.log(`[WorkVerification] Blob created: type=${blob.type}, size=${blob.size}`);

                // Create a File object from the blob
                const file = new File([blob], `after_${i}.jpg`, { type: blob.type });
                formData.append('afterImages', file);
            }

            // Log FormData contents
            console.log('[WorkVerification] FormData entries:');
            for (const pair of formData.entries()) {
                console.log(`  ${pair[0]}: ${pair[1]}`);
            }

            // Use native fetch instead of axios
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

            console.log(`[WorkVerification] Sending to: ${apiUrl}/v0/tasks/${id}/submit`);

            const fetchResponse = await fetch(`${apiUrl}/v0/tasks/${id}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            console.log(`[WorkVerification] Response status: ${fetchResponse.status}`);

            if (!fetchResponse.ok) {
                const errorText = await fetchResponse.text();
                console.error('[WorkVerification] Error response:', errorText);
                throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`);
            }

            const data = await fetchResponse.json();
            toast.success('Work submitted and verified!');
            setAiResults(data.aiResult);
            // Switch to AI view mode automatically
            if (data.aiResult?.details?.length > 0) {
                setViewMode('ai');
                setSelectedImageIndex(0);
                setActiveTab('ai');
            }
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
                            onClick={() => navigate('/my-tasks')}
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
                            ) : viewMode === 'ai' && selectedImageIndex !== null && aiResults?.details?.[selectedImageIndex] ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                    {/* Debug logging */}
                                    {(() => {
                                        const detail = aiResults.details[selectedImageIndex];
                                        console.log(`[WorkVerification] Rendering AI result ${selectedImageIndex}`);
                                        console.log(`[WorkVerification] Status: ${detail.status}`);
                                        return null;
                                    })()}

                                    {aiResults.details[selectedImageIndex].status === 'success' ? (
                                        <div className="relative w-full h-full flex gap-4">
                                            <div className="flex-1 flex flex-col">
                                                <p className={`text-center mb-2 font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Before (Annotated)</p>
                                                <div className="flex-1 relative bg-black/5 rounded-lg overflow-hidden">
                                                    <img
                                                        src={aiResults.details[selectedImageIndex].before_image_annotated}
                                                        alt="Annotated Before"
                                                        className="absolute inset-0 w-full h-full object-contain"
                                                        onError={(e) => console.error('Error loading before image', e)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                                <p className={`text-center mb-2 font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>After (Annotated)</p>
                                                <div className="flex-1 relative bg-black/5 rounded-lg overflow-hidden">
                                                    <img
                                                        src={aiResults.details[selectedImageIndex].after_image_annotated}
                                                        alt="Annotated After"
                                                        className="absolute inset-0 w-full h-full object-contain"
                                                        onError={(e) => console.error('Error loading after image', e)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`flex flex-col items-center justify-center p-8 rounded-lg border ${aiResults.details[selectedImageIndex].status === 'no_defect'
                                            ? theme === 'dark' ? 'border-amber-500/50 bg-amber-500/10' : 'border-amber-200 bg-amber-50'
                                            : theme === 'dark' ? 'border-red-500/50 bg-red-500/10' : 'border-red-200 bg-red-50'
                                            }`}>
                                            <h3 className={`text-lg font-bold mb-2 ${aiResults.details[selectedImageIndex].status === 'no_defect' ? 'text-amber-500' : 'text-red-500'
                                                }`}>
                                                {aiResults.details[selectedImageIndex].status === 'no_defect' ? 'No Defect Detected' : 'AI Analysis Failed'}
                                            </h3>
                                            <p className={`text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {aiResults.details[selectedImageIndex].message || 'Unknown error occurred during analysis'}
                                            </p>
                                            <p className="text-sm text-slate-500 mt-4">
                                                Status: {aiResults.details[selectedImageIndex].status}
                                            </p>
                                        </div>
                                    )}
                                </div>
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
                        {/* Tab Navigation */}
                        <div className={`flex border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                            <button
                                onClick={() => setActiveTab('reference')}
                                className={`flex-1 py-3 text-xs font-bold tracking-wider border-b-2 transition-colors ${activeTab === 'reference'
                                    ? theme === 'dark' ? 'border-indigo-500 text-indigo-400' : 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-400'
                                    }`}
                            >
                                REFERENCE
                            </button>
                            <button
                                onClick={() => setActiveTab('verification')}
                                className={`flex-1 py-3 text-xs font-bold tracking-wider border-b-2 transition-colors ${activeTab === 'verification'
                                    ? theme === 'dark' ? 'border-indigo-500 text-indigo-400' : 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-400'
                                    }`}
                            >
                                UPLOADED
                            </button>
                            {aiResults && (
                                <button
                                    onClick={() => setActiveTab('ai')}
                                    className={`flex-1 py-3 text-xs font-bold tracking-wider border-b-2 transition-colors ${activeTab === 'ai'
                                        ? theme === 'dark' ? 'border-indigo-500 text-indigo-400' : 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-400'
                                        }`}
                                >
                                    AI RESULTS
                                </button>
                            )}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Reference Tab */}
                            {activeTab === 'reference' && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="px-6 pt-4 pb-2">
                                        <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {task.beforeImages?.length || 0} Reference Images
                                        </div>
                                    </div>
                                    <CustomScrollbar className="flex-1">
                                        <div className="px-6 pb-4 space-y-3">
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
                                    </CustomScrollbar>
                                </div>
                            )}

                            {/* Verification Tab */}
                            {activeTab === 'verification' && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="px-6 pt-4 pb-2">
                                        <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {capturedImages.length} Uploaded Images
                                        </div>
                                    </div>
                                    <CustomScrollbar className="flex-1">
                                        <div className="px-6 pb-4 space-y-3">
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
                                                        {/* Only show delete button if AI results haven't been generated */}
                                                        {!aiResults && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeImage(img.id);
                                                                }}
                                                                className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={`flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg ${theme === 'dark' ? 'border-slate-700 text-slate-600' : 'border-slate-100 text-slate-400'}`}>
                                                    <ImageIcon size={24} className="mb-2 opacity-50" />
                                                    <p className="text-sm">No images uploaded</p>
                                                </div>
                                            )}
                                        </div>
                                    </CustomScrollbar>
                                </div>
                            )}

                            {/* AI Results Tab */}
                            {activeTab === 'ai' && aiResults && aiResults.details && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="px-6 pt-4 pb-2">
                                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${aiResults.verdict === 'FIXED' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                            }`}>
                                            VERDICT: {aiResults.verdict}
                                        </span>
                                        <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {aiResults.details.length} Analyzed Images
                                        </div>
                                    </div>
                                    <CustomScrollbar className="flex-1">
                                        <div className="px-6 pb-4 space-y-3">
                                            {aiResults.details.map((detail: any, index: number) => (
                                                <div
                                                    key={`ai-${index}`}
                                                    onClick={() => {
                                                        setViewMode('ai');
                                                        setSelectedImageIndex(index);
                                                    }}
                                                    className={`group flex items-center gap-4 p-2 rounded-lg cursor-pointer transition-all border ${viewMode === 'ai' && selectedImageIndex === index
                                                        ? theme === 'dark' ? 'border-purple-500/50 bg-purple-500/10' : 'border-purple-500 bg-purple-50'
                                                        : theme === 'dark' ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="w-16 h-16 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 relative">
                                                        {detail.after_image_annotated ? (
                                                            <img
                                                                src={detail.after_image_annotated}
                                                                alt={`AI Result ${index + 1}`}
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700">
                                                                <span className="text-xs text-slate-500">No Img</span>
                                                            </div>
                                                        )}
                                                        <div className={`absolute bottom-0 left-0 right-0 h-1 ${detail.phase2_deep_learning?.verdict === 'FIXED' ? 'bg-emerald-500' :
                                                            detail.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                                                            }`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                                            Result {index + 1}
                                                        </p>
                                                        <p className={`text-xs ${detail.phase2_deep_learning?.verdict === 'FIXED'
                                                            ? 'text-emerald-500'
                                                            : 'text-red-500'
                                                            }`}>
                                                            {detail.phase2_deep_learning?.verdict} ({detail.phase2_deep_learning?.confidence})
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                                </div>
                                            ))}
                                        </div>
                                    </CustomScrollbar>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
