import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { tasksAPI, Task } from '../services/api';
import { useAuth } from './AuthContext';

interface TasksContextType {
    tasks: Task[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
    fetchTasks: (force?: boolean) => Promise<void>;
    refreshTasks: () => Promise<void>;
    getTaskById: (id: string) => Task | undefined;
    // Computed values
    activeTasks: Task[];
    completedTasks: Task[];
    getTasksForDate: (date: Date) => Task[];
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<number | null>(null);

    // Check if cache is still valid
    const isCacheValid = useCallback(() => {
        if (!lastFetched) return false;
        return Date.now() - lastFetched < CACHE_DURATION;
    }, [lastFetched]);

    // Fetch tasks with optional force refresh
    const fetchTasks = useCallback(async (force = false) => {
        // If cache is valid and not forcing refresh, skip fetch
        if (!force && isCacheValid() && tasks.length > 0) {
            return;
        }

        if (!user) {
            setTasks([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const role = user.role === 'CLIENT' ? 'client' : 'worker';
            const data = await tasksAPI.getMyTasks(role);
            setTasks(data);
            setLastFetched(Date.now());
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
            setError('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [user, isCacheValid, tasks.length]);

    // Force refresh tasks
    const refreshTasks = useCallback(async () => {
        await fetchTasks(true);
    }, [fetchTasks]);

    // Get task by ID
    const getTaskById = useCallback((id: string) => {
        return tasks.find(task => task.id === id);
    }, [tasks]);

    // Computed: Active tasks
    const activeTasks = tasks.filter(task =>
        ['OPEN', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED'].includes(task.status)
    );

    // Computed: Completed tasks
    const completedTasks = tasks.filter(task =>
        ['COMPLETED', 'VERIFIED', 'PAID'].includes(task.status)
    );

    // Get tasks for a specific date
    const getTasksForDate = useCallback((date: Date): Task[] => {
        return tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline);
            return (
                taskDate.getFullYear() === date.getFullYear() &&
                taskDate.getMonth() === date.getMonth() &&
                taskDate.getDate() === date.getDate()
            );
        });
    }, [tasks]);

    // Fetch tasks when user changes
    useEffect(() => {
        if (user) {
            fetchTasks();
        } else {
            setTasks([]);
            setLastFetched(null);
        }
    }, [user]);

    return (
        <TasksContext.Provider
            value={{
                tasks,
                loading,
                error,
                lastFetched,
                fetchTasks,
                refreshTasks,
                getTaskById,
                activeTasks,
                completedTasks,
                getTasksForDate,
            }}
        >
            {children}
        </TasksContext.Provider>
    );
}

export function useTasks() {
    const context = useContext(TasksContext);
    if (context === undefined) {
        throw new Error('useTasks must be used within a TasksProvider');
    }
    return context;
}
