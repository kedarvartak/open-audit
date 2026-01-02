import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend running on local machine - use your computer's IP for physical devices
const API_URL = 'http://192.168.0.105:3001/v0';

// Legacy MinIO configuration (for migration period only)
const LEGACY_MINIO_HOST = '192.168.0.105';

console.log('[API] Base URL:', API_URL);

/**
 * Transform image URLs to be accessible from mobile device
 * 
 * Handles:
 * - Cloudinary URLs (https://res.cloudinary.com/...) - no transformation needed
 * - Legacy MinIO URLs with localhost - transforms to use actual host IP
 * - Firebase Storage URLs - no transformation needed
 */
export const transformImageUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;

    // Cloudinary, Firebase Storage, and other HTTPS URLs work as-is
    if (url.startsWith('https://')) {
        return url;
    }
    // kept for legacy minio, wont be using, but preserved in codebase 
    // Legacy MinIO URLs: Replace localhost with actual host IP
    // This is only needed during migration from MinIO to Cloudinary
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
        let transformedUrl = url.replace('localhost', LEGACY_MINIO_HOST);
        transformedUrl = transformedUrl.replace('127.0.0.1', LEGACY_MINIO_HOST);
        console.log('[Image] Transformed legacy URL:', url, '->', transformedUrl);
        return transformedUrl;
    }

    return url;
};

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests + logging
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.log('[API] Request error:', error.message);
        return Promise.reject(error);
    }
);

// Handle auth errors + logging
api.interceptors.response.use(
    (response) => {
        console.log(`[API] Response ${response.status}:`, response.config.url);
        return response;
    },
    async (error) => {
        console.log('[API] Error:', error.message);
        if (error.response) {
            console.log('[API] Status:', error.response.status);
            console.log('[API] Data:', JSON.stringify(error.response.data));
        } else if (error.request) {
            console.log('[API] No response received - check if backend is running');
            console.log('[API] Request was made to:', error.config?.url);
        }
        if (error.response?.status === 401) {
            await AsyncStorage.multiRemove(['token', 'user']);
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: async (email: string, password: string) => {
        console.log('[Auth] Attempting login for:', email);
        const response = await api.post('/auth/login', { email, password });
        const { access_token, user } = response.data;
        console.log('[Auth] Login successful, user:', user.email);

        // Store token and user
        await AsyncStorage.setItem('token', access_token);
        await AsyncStorage.setItem('user', JSON.stringify(user));

        return { token: access_token, user };
    },

    register: async (data: {
        email: string;
        password: string;
        name: string;
        role: 'CLIENT' | 'WORKER';
    }) => {
        const response = await api.post('/auth/register', data);
        const { token, user } = response.data;

        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));

        return response.data;
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    logout: async () => {
        await AsyncStorage.multiRemove(['token', 'user']);
    },
};

// Tasks API
export const tasksAPI = {
    getMarketplace: async () => {
        const response = await api.get('/tasks');
        return response.data;
    },

    getTask: async (id: string) => {
        const response = await api.get(`/tasks/${id}`);
        return response.data;
    },

    getMyTasks: async (role: 'client' | 'worker') => {
        const response = await api.get('/tasks/my-tasks', { params: { role } });
        return response.data;
    },

    acceptTask: async (id: string) => {
        const response = await api.post(`/tasks/${id}/accept`);
        return response.data;
    },

    submitWork: async (id: string, formData: FormData) => {
        const response = await api.post(`/tasks/${id}/submit`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    updateLocation: async (id: string, latitude: number, longitude: number) => {
        const response = await api.post(`/tasks/${id}/location`, {
            latitude,
            longitude,
        });
        return response.data;
    },
};

// Types
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'CLIENT' | 'WORKER';
    createdAt: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    category: string;
    budget: number;
    status: 'OPEN' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'PAID' | 'DISPUTED';
    location?: {
        latitude: number;
        longitude: number;
        address: string;
    };
    beforeImages: string[];
    afterImageUrl?: string;
    client: {
        id: string;
        name: string;
    };
    worker?: {
        id: string;
        name: string;
    };
    createdAt: string;
    deadline?: string;
}

export default api;
