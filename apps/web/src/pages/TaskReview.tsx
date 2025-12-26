import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { tasksAPI } from '../services/api';
import type { Task } from '../services/api';

export default function TaskReview() {
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const navigate = useNavigate();
    const { theme } = useTheme();

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
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!id) return;
        if (!confirm('Are you sure you want to approve this work? Payment will be released to the worker.')) {
            return;
        }

        try {
            setApproving(true);
            await tasksAPI.approveWork(id);
            toast.success('Work approved! Payment has been released to the worker.');
            navigate('/my-tasks');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to approve work');
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        if (!id) return;

        try {
            setRejecting(true);
            await tasksAPI.rejectWork(id, rejectReason);
            toast.success('Work rejected. Worker will be notified to make revisions.');
            navigate('/my-tasks');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to reject work');
        } finally {
            setRejecting(false);
            setShowRejectModal(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-64">
                    <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Loading task...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!task) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-64">
                    <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Task not found</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-8 space-y-6">
                <button
                    onClick={() => navigate('/my-tasks')}
                    className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'} transition-colors`}
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Back to My Tasks</span>
                </button>

                {/* Task Header */}
                <div className={`rounded-md border p-6 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`px-3 py-1 rounded text-xs font-semibold ${theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'}`}>
                                    {task.status}
                                </span>
                                <span className={`px-3 py-1 rounded text-xs font-semibold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                                    {task.category.toUpperCase()}
                                </span>
                            </div>
                            <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                {task.title}
                            </h1>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                {task.description}
                            </p>
                        </div>
                        <div className="text-right ml-6">
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Budget</p>
                            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                                Rs.{task.budget}
                            </p>
                        </div>
                    </div>

                    <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-slate-600' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Worker:</span>
                            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                                {task.worker?.name || 'Not assigned'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Submitted Work Preview */}
                <div className={`rounded-md border p-6 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        Submitted Work
                    </h2>

                    {/* Placeholder for files - in real implementation, you'd fetch and display actual files */}
                    <div className={`rounded-md p-6 text-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <FileText size={48} className={`mx-auto mb-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Proof of work files will be displayed here
                        </p>
                        <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                            (Files: Images, Videos, Documents)
                        </p>
                        <Button variant="outline" className="mt-4">
                            <Download size={18} className="mr-2" />
                            Download All
                        </Button>
                    </div>
                </div>

                {/* Review Actions */}
                <div className={`rounded-md border p-6 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        Review & Approve
                    </h2>
                    <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Please review the submitted work carefully. Approving will release the payment to the worker.
                    </p>

                    <div className="flex gap-4">
                        <Button
                            onClick={handleApprove}
                            disabled={approving}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle size={18} className="mr-2" />
                            {approving ? 'Approving...' : 'Approve & Release Payment'}
                        </Button>
                        <Button
                            onClick={() => setShowRejectModal(true)}
                            disabled={rejecting}
                            variant="outline"
                            className={`flex-1 ${theme === 'dark' ? 'border-red-500 text-red-400 hover:bg-red-500/10' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
                        >
                            <XCircle size={18} className="mr-2" />
                            Request Revision
                        </Button>
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`rounded-md p-6 max-w-md w-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                            Request Revision
                        </h3>
                        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Please provide a reason for requesting revision. This will help the worker understand what needs to be improved.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Explain what needs to be revised..."
                            rows={4}
                            className={`w-full px-4 py-3 rounded-md border mb-4 ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowRejectModal(false)}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReject}
                                disabled={rejecting || !rejectReason.trim()}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                {rejecting ? 'Submitting...' : 'Send Revision Request'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
