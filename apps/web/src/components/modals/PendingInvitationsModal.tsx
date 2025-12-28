import { useState, useEffect } from 'react';
import { X, Building2, Check, X as XIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { workspacesAPI, type PendingInvitation } from '../../services/api';
import toast from 'react-hot-toast';

interface PendingInvitationsModalProps {
    onClose: () => void;
}

export const PendingInvitationsModal = ({ onClose }: PendingInvitationsModalProps) => {
    const { theme } = useTheme();
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchInvitations();
    }, []);

    const fetchInvitations = async () => {
        try {
            const response = await workspacesAPI.getPendingInvitations();
            setInvitations(response.data);
        } catch (error) {
            console.error('Failed to fetch invitations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (workspaceId: string) => {
        setProcessing(workspaceId);
        try {
            await workspacesAPI.acceptInvitation(workspaceId);
            setInvitations(invitations.filter(i => i.workspaceId !== workspaceId));
            toast.success('Invitation accepted! You\'ve joined the workspace.');

            // Close modal if no more invitations
            if (invitations.length <= 1) {
                onClose();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to accept invitation');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (workspaceId: string) => {
        setProcessing(workspaceId);
        try {
            await workspacesAPI.rejectInvitation(workspaceId);
            setInvitations(invitations.filter(i => i.workspaceId !== workspaceId));
            toast.success('Invitation declined.');

            // Close modal if no more invitations
            if (invitations.length <= 1) {
                onClose();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to decline invitation');
        } finally {
            setProcessing(null);
        }
    };

    // Don't render if no invitations
    if (!loading && invitations.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-[#464ace]/20' : 'bg-[#464ace]/10'}`}>
                            <Building2 size={24} className="text-[#464ace]" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Pending Invitations
                            </h2>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                You have {invitations.length} pending workspace invitation{invitations.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#464ace]"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {invitations.map((invitation) => (
                                <div
                                    key={invitation.id}
                                    className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${theme === 'dark' ? 'bg-[#464ace]/20 text-[#464ace]' : 'bg-[#464ace]/10 text-[#464ace]'}`}>
                                                {invitation.workspace.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                    {invitation.workspace.name}
                                                </h3>
                                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    Invited by <span className="font-medium">{invitation.workspace.owner.name}</span>
                                                </p>
                                                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Role: <span className="font-medium uppercase">{invitation.role}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {invitation.workspace.description && (
                                        <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {invitation.workspace.description}
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => handleAccept(invitation.workspaceId)}
                                            disabled={processing === invitation.workspaceId}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#464ace] text-white font-medium hover:bg-[#3a3eb8] transition-colors disabled:opacity-50"
                                        >
                                            <Check size={18} />
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleReject(invitation.workspaceId)}
                                            disabled={processing === invitation.workspaceId}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${theme === 'dark'
                                                ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            <XIcon size={18} />
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
