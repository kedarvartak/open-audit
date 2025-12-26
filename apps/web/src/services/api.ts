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
        api.post('/auth/register', data),

    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),

    getProfile: () => api.get('/auth/profile'),
};

export const tasksAPI = {
    getMarketplace: (filters?: { category?: string; minBudget?: number; maxBudget?: number }) =>
        api.get('/tasks', { params: filters }),

    getTask: (id: string) => api.get(`/tasks/${id}`),

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
    }) => api.post('/tasks', data),

    acceptTask: (id: string) => api.post(`/tasks/${id}/accept`),

    getMyTasks: (role: 'client' | 'worker') =>
        api.get('/tasks/my-tasks', { params: { role } }),

    startWork: (id: string, formData: FormData) =>
        api.post(`/tasks/${id}/start`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    submitWork: (id: string, formData: FormData) =>
        api.post(`/tasks/${id}/submit`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    disputeTask: (id: string, reason: string) =>
        api.post(`/tasks/${id}/dispute`, { reason }),
};

export default api;
