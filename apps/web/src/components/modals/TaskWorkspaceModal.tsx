import { useState, useEffect } from 'react';
import { X, Upload, File, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { tasksAPI } from '../../services/api';
import type { Task } from '../../services/api';

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
    const { theme } = useTheme();

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
            toast.error('Failed to load task');
        } finally {
            setLoading(false);
        }
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-md shadow-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    }`}
            >
                {/* Header */}
                <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                    <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        Task Workspace
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                            }`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Loading task...
                        </div>
                    ) : !task ? (
                        <div className={`flex justify-center items-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Task not found
                        </div>
                    ) : (
                        <>
                            {/* Task Header */}
                            <div className={`rounded-md border p-6 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <span className={`px-3 py-1 rounded text-xs font-semibold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                                            {task.category.toUpperCase()}
                                        </span>
                                        <h1 className={`text-2xl font-bold mt-3 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                            {task.title}
                                        </h1>
                                        <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {task.description}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Budget</p>
                                        <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                                            Rs.{task.budget}
                                        </p>
                                    </div>
                                </div>

                                {task.locationName && (
                                    <div className={`flex items-center gap-2 mt-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <MapPin size={18} />
                                        <span className="text-sm">{task.locationName}</span>
                                    </div>
                                )}
                            </div>

                            {/* Work Status & Actions */}
                            {task.status === 'ACCEPTED' && (
                                <div className={`rounded-md border p-6 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                                    <h2 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                        Ready to Start?
                                    </h2>
                                    <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Click the button below to mark this task as in progress
                                    </p>
                                    <Button onClick={handleStartWork}>Start Work</Button>
                                </div>
                            )}

                            {task.status === 'IN_PROGRESS' && (
                                <>
                                    {/* File Upload Section */}
                                    <div className={`rounded-md border p-6 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                                        <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                            Upload Proof of Work
                                        </h2>

                                        <div className={`border-2 border-dashed rounded-md p-8 text-center ${theme === 'dark' ? 'border-slate-600 bg-slate-800/30' : 'border-slate-300 bg-slate-50'}`}>
                                            <Upload size={48} className={`mx-auto mb-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                            <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                Drag and drop files here, or click to browse
                                            </p>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                                Supported: Images, Videos, PDFs (Max 10MB each)
                                            </p>
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleFileChange}
                                                accept="image/*,video/*,application/pdf"
                                                className="hidden"
                                                id="file-upload"
                                            />
                                            <label htmlFor="file-upload">
                                                <Button className="mt-4 cursor-pointer" type="button">
                                                    Browse Files
                                                </Button>
                                            </label>
                                        </div>

                                        {/* Uploaded Files List */}
                                        {files.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                    Uploaded Files ({files.length})
                                                </p>
                                                {files.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className={`flex items-center justify-between p-3 rounded-md ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <File size={20} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                                                            <div>
                                                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                                                    {file.name}
                                                                </p>
                                                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeFile(index)}
                                                            className={`p-1 rounded hover:bg-red-500/10 transition-colors ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes Section */}
                                    <div className={`rounded-md border p-6 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                                        <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                            Additional Notes (Optional)
                                        </h2>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add any notes or comments about the completed work..."
                                            rows={4}
                                            className={`w-full px-4 py-3 rounded-md border ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                                <div className={`rounded-md border p-6 text-center ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                                    <div className={`w-16 h-16 rounded-sm mx-auto mb-4 flex items-center justify-center ${theme === 'dark' ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                        <Upload size={32} />
                                    </div>
                                    <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                        Work Submitted
                                    </h2>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Your work has been submitted for review. The client will review it shortly.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
