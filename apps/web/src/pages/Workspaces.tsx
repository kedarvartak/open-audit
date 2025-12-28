import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useTheme } from '../contexts/ThemeContext';
import { workspacesAPI, type Workspace } from '../services/api';
import {
    Plus,
    Users,
    Trash2,
    UserPlus,
    Crown,
    Shield,
    User,
    Pencil
} from 'lucide-react';
import toast from 'react-hot-toast';

const Workspaces = () => {
    const { theme } = useTheme();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Form states
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    const currentUserId = localStorage.getItem('userId');

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const fetchWorkspaces = async () => {
        try {
            setLoading(true);
            const response = await workspacesAPI.getMyWorkspaces();
            setWorkspaces(response.data);
            if (response.data.length > 0 && !selectedWorkspace) {
                setSelectedWorkspace(response.data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch workspaces:', error);
            toast.error('Failed to load workspaces');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) {
            toast.error('Please enter a workspace name');
            return;
        }

        try {
            const response = await workspacesAPI.createWorkspace({
                name: newWorkspaceName,
                description: newWorkspaceDescription || undefined,
            });
            setWorkspaces([...workspaces, response.data]);
            setSelectedWorkspace(response.data);
            setShowCreateModal(false);
            setNewWorkspaceName('');
            setNewWorkspaceDescription('');
            toast.success('Workspace created successfully!');
        } catch (error) {
            console.error('Failed to create workspace:', error);
            toast.error('Failed to create workspace');
        }
    };

    const handleInviteMember = async () => {
        if (!inviteEmail.trim() || !selectedWorkspace) {
            toast.error('Please enter an email address');
            return;
        }

        try {
            await workspacesAPI.inviteMember(selectedWorkspace.id, inviteEmail, inviteRole);
            const response = await workspacesAPI.getWorkspace(selectedWorkspace.id);
            setSelectedWorkspace(response.data);
            setWorkspaces(workspaces.map(w => w.id === selectedWorkspace.id ? response.data : w));
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteRole('MEMBER');
            toast.success('Member invited successfully!');
        } catch (error: any) {
            console.error('Failed to invite member:', error);
            toast.error(error.response?.data?.message || 'Failed to invite member');
        }
    };

    const handleUpdateWorkspace = async () => {
        if (!editName.trim() || !selectedWorkspace) return;

        try {
            const response = await workspacesAPI.updateWorkspace(selectedWorkspace.id, {
                name: editName,
                description: editDescription || undefined,
            });
            setSelectedWorkspace({ ...selectedWorkspace, ...response.data });
            setWorkspaces(workspaces.map(w => w.id === selectedWorkspace.id ? { ...w, ...response.data } : w));
            setShowEditModal(false);
            toast.success('Workspace updated successfully!');
        } catch (error) {
            console.error('Failed to update workspace:', error);
            toast.error('Failed to update workspace');
        }
    };

    const handleDeleteWorkspace = async (workspaceId: string) => {
        if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) return;

        try {
            await workspacesAPI.deleteWorkspace(workspaceId);
            setWorkspaces(workspaces.filter(w => w.id !== workspaceId));
            if (selectedWorkspace?.id === workspaceId) {
                setSelectedWorkspace(workspaces.find(w => w.id !== workspaceId) || null);
            }
            toast.success('Workspace deleted successfully!');
        } catch (error: any) {
            console.error('Failed to delete workspace:', error);
            toast.error(error.response?.data?.message || 'Failed to delete workspace');
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!selectedWorkspace) return;
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            await workspacesAPI.removeMember(selectedWorkspace.id, memberId);
            const response = await workspacesAPI.getWorkspace(selectedWorkspace.id);
            setSelectedWorkspace(response.data);
            toast.success('Member removed successfully!');
        } catch (error: any) {
            console.error('Failed to remove member:', error);
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleUpdateMemberRole = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
        if (!selectedWorkspace) return;

        try {
            await workspacesAPI.updateMemberRole(selectedWorkspace.id, memberId, newRole);
            const response = await workspacesAPI.getWorkspace(selectedWorkspace.id);
            setSelectedWorkspace(response.data);
            toast.success('Member role updated!');
        } catch (error: any) {
            console.error('Failed to update member role:', error);
            toast.error(error.response?.data?.message || 'Failed to update role');
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'OWNER': return <Crown size={14} className="text-amber-500" />;
            case 'ADMIN': return <Shield size={14} className="text-blue-500" />;
            default: return <User size={14} className="text-slate-400" />;
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'OWNER': return 'bg-amber-500/20 text-amber-500';
            case 'ADMIN': return 'bg-blue-500/20 text-blue-500';
            default: return theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600';
        }
    };

    const openEditModal = () => {
        if (selectedWorkspace) {
            setEditName(selectedWorkspace.name);
            setEditDescription(selectedWorkspace.description || '');
            setShowEditModal(true);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 h-full flex gap-6">
                {/* Workspaces List */}
                <div className={`w-80 flex-shrink-0 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} flex flex-col`}>
                    <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        <h2 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            My Workspaces
                        </h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="p-2 rounded-lg bg-[#464ace] hover:bg-[#3a3eb8] text-white transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto p-3 space-y-2">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#464ace]" />
                            </div>
                        ) : workspaces.length === 0 ? (
                            <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                <Users size={40} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No workspaces yet</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-2 text-[#464ace] text-sm font-medium hover:underline"
                                >
                                    Create your first workspace
                                </button>
                            </div>
                        ) : (
                            workspaces.map(workspace => (
                                <button
                                    key={workspace.id}
                                    onClick={() => setSelectedWorkspace(workspace)}
                                    className={`w-full p-3 rounded-lg text-left transition-all ${selectedWorkspace?.id === workspace.id
                                            ? 'bg-[#464ace]/10 border border-[#464ace]'
                                            : theme === 'dark'
                                                ? 'hover:bg-slate-800 border border-transparent'
                                                : 'hover:bg-slate-50 border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#464ace] flex items-center justify-center text-white font-bold">
                                            {workspace.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                {workspace.name}
                                            </p>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {workspace._count?.members || workspace.members?.length || 0} members
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Workspace Details */}
                <div className={`flex-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} flex flex-col overflow-hidden`}>
                    {selectedWorkspace ? (
                        <>
                            {/* Header */}
                            <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-[#464ace] flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedWorkspace.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                            {selectedWorkspace.name}
                                        </h1>
                                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {selectedWorkspace.description || 'No description'}
                                        </p>
                                    </div>
                                </div>

                                {selectedWorkspace.ownerId === currentUserId && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={openEditModal}
                                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWorkspace(selectedWorkspace.id)}
                                            className={`p-2 rounded-lg transition-colors text-red-500 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Members Section */}
                            <div className="flex-1 overflow-auto p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Members ({selectedWorkspace.members?.length || 0})
                                    </h3>
                                    {(selectedWorkspace.ownerId === currentUserId ||
                                        selectedWorkspace.members?.find(m => m.userId === currentUserId)?.role === 'ADMIN') && (
                                            <button
                                                onClick={() => setShowInviteModal(true)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#464ace] hover:bg-[#3a3eb8] text-white text-sm font-medium transition-colors"
                                            >
                                                <UserPlus size={16} />
                                                Invite Member
                                            </button>
                                        )}
                                </div>

                                <div className="space-y-2">
                                    {selectedWorkspace.members?.map(member => (
                                        <div
                                            key={member.id}
                                            className={`p-4 rounded-xl border flex items-center justify-between ${theme === 'dark'
                                                    ? 'bg-slate-800 border-slate-700'
                                                    : 'bg-slate-50 border-slate-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-300 text-slate-700'
                                                    }`}>
                                                    {member.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                        {member.user.name}
                                                        {member.userId === currentUserId && (
                                                            <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                (You)
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {member.user.email}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                                                    {getRoleIcon(member.role)}
                                                    {member.role}
                                                </span>

                                                {selectedWorkspace.ownerId === currentUserId && member.role !== 'OWNER' && (
                                                    <div className="flex items-center gap-1">
                                                        {member.role === 'MEMBER' ? (
                                                            <button
                                                                onClick={() => handleUpdateMemberRole(member.userId, 'ADMIN')}
                                                                className="p-1.5 rounded text-xs text-blue-500 hover:bg-blue-500/10"
                                                                title="Promote to Admin"
                                                            >
                                                                <Shield size={14} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleUpdateMemberRole(member.userId, 'MEMBER')}
                                                                className="p-1.5 rounded text-xs text-slate-400 hover:bg-slate-500/10"
                                                                title="Demote to Member"
                                                            >
                                                                <User size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemoveMember(member.userId)}
                                                            className="p-1.5 rounded text-xs text-red-500 hover:bg-red-500/10"
                                                            title="Remove Member"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={`flex-1 flex flex-col items-center justify-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Users size={64} className="mb-4 opacity-30" />
                            <p className="text-lg font-medium">Select a workspace</p>
                            <p className="text-sm">Choose a workspace from the list or create a new one</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Workspace Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-md rounded-2xl p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Create Workspace
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Workspace Name *
                                </label>
                                <input
                                    type="text"
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    placeholder="e.g., My Team"
                                    className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                        } focus:outline-none focus:ring-2 focus:ring-[#464ace]`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={newWorkspaceDescription}
                                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                                    placeholder="What is this workspace for?"
                                    rows={3}
                                    className={`w-full px-4 py-3 rounded-lg border resize-none ${theme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                        } focus:outline-none focus:ring-2 focus:ring-[#464ace]`}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewWorkspaceName('');
                                    setNewWorkspaceDescription('');
                                }}
                                className={`px-4 py-2 rounded-lg font-medium ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateWorkspace}
                                className="px-4 py-2 rounded-lg bg-[#464ace] hover:bg-[#3a3eb8] text-white font-medium"
                            >
                                Create Workspace
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Member Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-md rounded-2xl p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Invite Member
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="colleague@example.com"
                                    className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                        } focus:outline-none focus:ring-2 focus:ring-[#464ace]`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Role
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setInviteRole('MEMBER')}
                                        className={`flex-1 px-4 py-3 rounded-lg border font-medium transition-colors ${inviteRole === 'MEMBER'
                                                ? 'border-[#464ace] bg-[#464ace]/10 text-[#464ace]'
                                                : theme === 'dark'
                                                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <User size={16} className="inline mr-2" />
                                        Member
                                    </button>
                                    <button
                                        onClick={() => setInviteRole('ADMIN')}
                                        className={`flex-1 px-4 py-3 rounded-lg border font-medium transition-colors ${inviteRole === 'ADMIN'
                                                ? 'border-[#464ace] bg-[#464ace]/10 text-[#464ace]'
                                                : theme === 'dark'
                                                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Shield size={16} className="inline mr-2" />
                                        Admin
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowInviteModal(false);
                                    setInviteEmail('');
                                    setInviteRole('MEMBER');
                                }}
                                className={`px-4 py-2 rounded-lg font-medium ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleInviteMember}
                                className="px-4 py-2 rounded-lg bg-[#464ace] hover:bg-[#3a3eb8] text-white font-medium"
                            >
                                Send Invite
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Workspace Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-md rounded-2xl p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Edit Workspace
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Workspace Name *
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-white'
                                            : 'bg-white border-slate-300 text-slate-900'
                                        } focus:outline-none focus:ring-2 focus:ring-[#464ace]`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Description
                                </label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={3}
                                    className={`w-full px-4 py-3 rounded-lg border resize-none ${theme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-white'
                                            : 'bg-white border-slate-300 text-slate-900'
                                        } focus:outline-none focus:ring-2 focus:ring-[#464ace]`}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className={`px-4 py-2 rounded-lg font-medium ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateWorkspace}
                                className="px-4 py-2 rounded-lg bg-[#464ace] hover:bg-[#3a3eb8] text-white font-medium"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Workspaces;
