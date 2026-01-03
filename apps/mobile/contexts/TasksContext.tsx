import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
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
    updateTaskInCache: (taskId: string, updates: Partial<Task>) => void;
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

    // Track if a fetch is already in progress to prevent duplicate requests
    const fetchInProgress = useRef(false);
    // Track the last user ID to detect user changes
    const lastUserId = useRef<string | null>(null);

    // Check if cache is still valid
    const isCacheValid = useCallback(() => {
        if (!lastFetched) return false;
        return Date.now() - lastFetched < CACHE_DURATION;
    }, [lastFetched]);

    // Fetch tasks with optional force refresh
    const fetchTasks = useCallback(async (force = false) => {
        // If cache is valid and not forcing refresh, skip fetch
        if (!force && isCacheValid() && tasks.length > 0) {
            console.log('[TasksContext] Using cached tasks');
            return;
        }

        // Prevent duplicate simultaneous requests
        if (fetchInProgress.current) {
            console.log('[TasksContext] Fetch already in progress, skipping');
            return;
        }

        if (!user) {
            setTasks([]);
            return;
        }

        fetchInProgress.current = true;

        // Only show loading if we don't have cached data
        if (tasks.length === 0) {
            setLoading(true);
        }
        setError(null);

        try {
            const role = user.role === 'CLIENT' ? 'client' : 'worker';
            console.log('[TasksContext] Fetching tasks for role:', role);

            // For workers, fetch both their assigned tasks AND marketplace tasks
            if (user.role === 'WORKER') {
                const [myTasks, marketplaceTasks] = await Promise.all([
                    tasksAPI.getMyTasks(role),
                    tasksAPI.getMarketplace()
                ]);

                // Combine and deduplicate tasks (marketplace may include assigned tasks)
                const taskMap = new Map<string, Task>();
                myTasks.forEach((task: Task) => taskMap.set(task.id, task));
                marketplaceTasks.forEach((task: Task) => taskMap.set(task.id, task));

                const allTasks = Array.from(taskMap.values());
                setTasks(allTasks);
                console.log('[TasksContext] Worker tasks fetched:', allTasks.length, '(my:', myTasks.length, '+ marketplace:', marketplaceTasks.length, ')');
            } else {
                // For clients, just fetch their tasks
                const data = await tasksAPI.getMyTasks(role);
                setTasks(data);
                console.log('[TasksContext] Client tasks fetched:', data.length);
            }

            setLastFetched(Date.now());
        } catch (err) {
            console.error('[TasksContext] Failed to fetch tasks:', err);
            setError('Failed to load tasks');
        } finally {
            setLoading(false);
            fetchInProgress.current = false;
        }
    }, [user, isCacheValid, tasks.length]);

    // Force refresh tasks
    const refreshTasks = useCallback(async () => {
        await fetchTasks(true);
    }, [fetchTasks]);

    // Get task by ID from cache
    const getTaskById = useCallback((id: string) => {
        return tasks.find(task => task.id === id);
    }, [tasks]);

    // Update a single task in cache (for optimistic updates)
    const updateTaskInCache = useCallback((taskId: string, updates: Partial<Task>) => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === taskId ? { ...task, ...updates } : task
            )
        );
    }, []);

    // Computed: Active tasks (memoized)
    const activeTasks = React.useMemo(() =>
        tasks.filter(task =>
            ['OPEN', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED'].includes(task.status)
        ),
        [tasks]
    );

    // Computed: Completed tasks (memoized)
    const completedTasks = React.useMemo(() =>
        tasks.filter(task =>
            ['COMPLETED', 'VERIFIED', 'PAID'].includes(task.status)
        ),
        [tasks]
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

    // Fetch tasks only when user changes (not on every render)
    useEffect(() => {
        const currentUserId = user?.id ?? null;

        // Only fetch if user actually changed
        if (currentUserId !== lastUserId.current) {
            lastUserId.current = currentUserId;

            if (user) {
                // Reset cache on user change
                setLastFetched(null);
                fetchTasks(true);
            } else {
                setTasks([]);
                setLastFetched(null);
            }
        }
    }, [user?.id]); // Only depend on user.id, not the entire user object

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
                updateTaskInCache,
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
