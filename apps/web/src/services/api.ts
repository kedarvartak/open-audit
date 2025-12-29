import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'CLIENT' | 'WORKER' | 'ADMIN';
    rating: number;
    completedTasks: number;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    category: string;
    budget: number;
    status: string;
    requiresLocation: boolean;
    locationName?: string;
    beforeImages: string[];   // Array of image URLs uploaded by client
    afterImageUrl?: string;   // Image uploaded by worker during completion
    deadline?: string;        // Task deadline
    createdAt: string;
    client: {
        id: string;
        name: string;
        rating: number;
    };
    worker?: {
        id: string;
        name: string;
        rating: number;
    };
}

export const authAPI = {
    register: (data: { email: string; password: string; name: string; role: string }) =>
        api.post('/v0/auth/register', data),

    login: (email: string, password: string) =>
        api.post('/v0/auth/login', { email, password }),

    getProfile: () => api.get('/v0/auth/profile'),

    updateFcmToken: (token: string) => api.post('/v0/auth/fcm-token', { token }),

    checkUserExists: (email: string) => api.get<{ exists: boolean }>('/v0/auth/check-user-exists', { params: { email } }),
};

export const tasksAPI = {
    getMarketplace: (filters?: { category?: string; minBudget?: number; maxBudget?: number }) =>
        api.get('/v0/tasks', { params: filters }),

    getTask: (id: string) => api.get(`/v0/tasks/${id}`),

    createTask: (data: {
        title: string;
        description: string;
        category: string;
        budget: number;
        requiresLocation?: boolean;
        locationLat?: number;
        locationLng?: number;
        locationRadius?: number;
        locationName?: string;
    }) => api.post('/v0/tasks', data),

    acceptTask: (id: string) => api.post(`/v0/tasks/${id}/accept`),

    getMyTasks: (role: 'client' | 'worker') =>
        api.get('/v0/tasks/my-tasks', { params: { role } }),

    startWork: (id: string, formData: FormData) =>
        api.post(`/v0/tasks/${id}/start`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    submitWork: (id: string, formData: FormData) =>
        api.post(`/v0/tasks/${id}/submit`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    approveWork: (id: string) => api.post(`/v0/tasks/${id}/approve`),

    rejectWork: (id: string, reason: string) => api.post(`/v0/tasks/${id}/reject`, { reason }),

    disputeTask: (id: string, reason: string) =>
        api.post(`/v0/tasks/${id}/dispute`, { reason }),

    updateTask: (id: string, formData: FormData) =>
        api.put(`/v0/tasks/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    deleteTask: (id: string) => api.delete(`/v0/tasks/${id}`),

    enhanceDescription: (description: string) =>
        api.post('/v0/tasks/enhance-description', { description }),
};

// Workspace types
export interface WorkspaceMember {
    id: string;
    userId: string;
    workspaceId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    inviteStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    invitedById?: string;
    invitedAt: string;
    joinedAt?: string;
    respondedAt?: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
}

export interface PendingInvitation extends WorkspaceMember {
    workspace: Workspace & {
        owner: {
            id: string;
            name: string;
            email: string;
        };
    };
}

export interface Workspace {
    id: string;
    name: string;
    description?: string;
    logo?: string;
    ownerId: string;
    owner: {
        id: string;
        name: string;
        email: string;
    };
    members: WorkspaceMember[];
    _count?: {
        tasks: number;
        members: number;
    };
    createdAt: string;
    updatedAt: string;
}

export const workspacesAPI = {
    // Get all workspaces for current user
    getMyWorkspaces: () => api.get<Workspace[]>('/v0/workspaces'),

    // Get active workspace
    getActiveWorkspace: () => api.get<Workspace | null>('/v0/workspaces/active'),

    // Set active workspace
    setActiveWorkspace: (workspaceId: string) =>
        api.post(`/v0/workspaces/active/${workspaceId}`),

    // Get single workspace
    getWorkspace: (id: string) => api.get<Workspace>(`/v0/workspaces/${id}`),

    // Create workspace
    createWorkspace: (data: { name: string; description?: string }) =>
        api.post<Workspace>('/v0/workspaces', data),

    // Update workspace
    updateWorkspace: (id: string, data: { name?: string; description?: string }) =>
        api.put<Workspace>(`/v0/workspaces/${id}`, data),

    // Delete workspace
    deleteWorkspace: (id: string) => api.delete(`/v0/workspaces/${id}`),

    // Invite member (creates user if not exists)
    inviteMember: (workspaceId: string, email: string, password: string, role?: 'ADMIN' | 'MEMBER') =>
        api.post<WorkspaceMember>(`/v0/workspaces/${workspaceId}/members`, { email, password, role }),

    // Remove member
    removeMember: (workspaceId: string, userId: string) =>
        api.delete(`/v0/workspaces/${workspaceId}/members/${userId}`),

    // Update member role
    updateMemberRole: (workspaceId: string, userId: string, role: 'ADMIN' | 'MEMBER') =>
        api.put(`/v0/workspaces/${workspaceId}/members/${userId}`, { role }),

    // Get pending invitations for current user
    getPendingInvitations: () => api.get<PendingInvitation[]>('/v0/workspaces/invitations/pending'),

    // Accept invitation
    acceptInvitation: (workspaceId: string) =>
        api.post(`/v0/workspaces/invitations/${workspaceId}/accept`),

    // Reject invitation
    rejectInvitation: (workspaceId: string) =>
        api.post(`/v0/workspaces/invitations/${workspaceId}/reject`),

    // Export workspace to Google Sheets
    exportWorkspaceToSheets: (workspaceId: string) =>
        api.post<{ url: string }>('/v0/export/workspace-to-sheets', { workspaceId }),
};

export default api;


