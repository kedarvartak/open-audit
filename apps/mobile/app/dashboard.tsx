import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { tasksAPI, Task } from '../services/api';
import { Logo } from '../components/ui/Logo';
import {
    MapPin,
    Clock,
    DollarSign,
    Briefcase,
    LogOut,
    Search,
    Filter,
} from 'lucide-react-native';
import { router } from 'expo-router';

// Skeleton component for loading state
const TaskCardSkeleton = () => (
    <View className="bg-slate-100 rounded-2xl p-4 mb-4">
        <View className="w-full h-32 bg-slate-200 rounded-xl mb-3 animate-pulse" />
        <View className="h-5 bg-slate-200 rounded w-3/4 mb-2 animate-pulse" />
        <View className="h-4 bg-slate-200 rounded w-1/2 mb-3 animate-pulse" />
        <View className="flex-row justify-between">
            <View className="h-4 bg-slate-200 rounded w-20 animate-pulse" />
            <View className="h-4 bg-slate-200 rounded w-16 animate-pulse" />
        </View>
    </View>
);

// Task Card Component
const TaskCard = ({ task, onPress }: { task: Task; onPress: () => void }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN':
                return 'bg-emerald-100 text-emerald-700';
            case 'ACCEPTED':
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-700';
            case 'COMPLETED':
            case 'VERIFIED':
                return 'bg-purple-100 text-purple-700';
            case 'PAID':
                return 'bg-green-100 text-green-700';
            case 'DISPUTED':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    const formatBudget = (budget: number) => {
        return `₹${budget.toLocaleString()}`;
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const created = new Date(date);
        const diffMs = now.getTime() - created.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return created.toLocaleDateString();
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden border border-slate-100"
            activeOpacity={0.7}
        >
            {/* Image */}
            <View className="w-full h-36 bg-slate-100">
                {task.beforeImages?.length > 0 ? (
                    <Image
                        source={{ uri: task.beforeImages[0] }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="w-full h-full items-center justify-center">
                        <Briefcase size={32} color="#94a3b8" />
                    </View>
                )}
                {/* Status Badge */}
                <View className="absolute top-3 left-3">
                    <View className={`px-2.5 py-1 rounded-full ${getStatusColor(task.status).split(' ')[0]}`}>
                        <Text className={`text-xs font-semibold ${getStatusColor(task.status).split(' ')[1]}`}>
                            {task.status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            <View className="p-4">
                {/* Title & Budget */}
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-base font-bold text-slate-900 flex-1 mr-2" numberOfLines={1}>
                        {task.title}
                    </Text>
                    <View className="flex-row items-center">
                        <DollarSign size={14} color="#059669" />
                        <Text className="text-base font-bold text-emerald-600">
                            {formatBudget(task.budget)}
                        </Text>
                    </View>
                </View>

                {/* Description */}
                <Text className="text-sm text-slate-500 mb-3" numberOfLines={2}>
                    {task.description || 'No description provided'}
                </Text>

                {/* Meta Info */}
                <View className="flex-row items-center justify-between">
                    {/* Location */}
                    {task.location?.address && (
                        <View className="flex-row items-center flex-1 mr-2">
                            <MapPin size={14} color="#64748b" />
                            <Text className="text-xs text-slate-500 ml-1" numberOfLines={1}>
                                {task.location.address.split(',')[0]}
                            </Text>
                        </View>
                    )}

                    {/* Time */}
                    <View className="flex-row items-center">
                        <Clock size={14} color="#64748b" />
                        <Text className="text-xs text-slate-500 ml-1">
                            {getTimeAgo(task.createdAt)}
                        </Text>
                    </View>
                </View>

                {/* Category */}
                <View className="mt-3 pt-3 border-t border-slate-100">
                    <View className="flex-row items-center">
                        <View className="bg-slate-100 px-2 py-1 rounded-md">
                            <Text className="text-xs font-medium text-slate-600">
                                {task.category || 'General'}
                            </Text>
                        </View>
                        {task.client?.name && (
                            <Text className="text-xs text-slate-400 ml-auto">
                                by {task.client.name}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function Dashboard() {
    const { user, logout, loading: authLoading } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'open'>('all');

    const fetchTasks = async () => {
        try {
            const data = await tasksAPI.getMarketplace();
            setTasks(data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTasks();
    }, []);

    const handleTaskPress = (taskId: string) => {
        // TODO: Navigate to task details
        console.log('Task pressed:', taskId);
        // router.push(`/task/${taskId}`);
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'open') return task.status === 'OPEN';
        return true;
    });

    const openTasksCount = tasks.filter(t => t.status === 'OPEN').length;

    if (authLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#6366f1" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="bg-white px-5 pt-4 pb-4 border-b border-slate-100">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                        <Logo width={32} height={32} />
                        <View className="ml-3">
                            <Text className="text-lg font-bold text-slate-900">
                                Hey, {user?.name?.split(' ')[0] || 'Worker'}! 👋
                            </Text>
                            <Text className="text-sm text-slate-500">
                                {user?.email}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={logout}
                        className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
                    >
                        <LogOut size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View className="flex-row gap-3">
                    <View className="flex-1 bg-indigo-50 rounded-xl p-3">
                        <Text className="text-2xl font-bold text-indigo-600">
                            {openTasksCount}
                        </Text>
                        <Text className="text-xs text-indigo-600 font-medium">
                            Open Tasks
                        </Text>
                    </View>
                    <View className="flex-1 bg-emerald-50 rounded-xl p-3">
                        <Text className="text-2xl font-bold text-emerald-600">
                            {tasks.length}
                        </Text>
                        <Text className="text-xs text-emerald-600 font-medium">
                            Total Tasks
                        </Text>
                    </View>
                </View>
            </View>

            {/* Filter Bar */}
            <View className="flex-row items-center px-5 py-3 bg-white border-b border-slate-100">
                <TouchableOpacity
                    onPress={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full mr-2 ${filter === 'all' ? 'bg-slate-900' : 'bg-slate-100'
                        }`}
                >
                    <Text className={`text-sm font-medium ${filter === 'all' ? 'text-white' : 'text-slate-600'
                        }`}>
                        All Tasks
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setFilter('open')}
                    className={`px-4 py-2 rounded-full ${filter === 'open' ? 'bg-emerald-500' : 'bg-slate-100'
                        }`}
                >
                    <Text className={`text-sm font-medium ${filter === 'open' ? 'text-white' : 'text-slate-600'
                        }`}>
                        Open Only
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Task List */}
            <ScrollView
                className="flex-1 px-5 pt-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#6366f1"
                    />
                }
            >
                {/* Section Header */}
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-lg font-bold text-slate-900">
                        Available Tasks
                    </Text>
                    <Text className="text-sm text-slate-500">
                        {filteredTasks.length} tasks
                    </Text>
                </View>

                {loading ? (
                    <>
                        <TaskCardSkeleton />
                        <TaskCardSkeleton />
                        <TaskCardSkeleton />
                    </>
                ) : filteredTasks.length === 0 ? (
                    <View className="items-center justify-center py-20">
                        <Briefcase size={48} color="#cbd5e1" />
                        <Text className="text-lg font-semibold text-slate-400 mt-4">
                            No tasks found
                        </Text>
                        <Text className="text-sm text-slate-400 mt-1">
                            Pull down to refresh
                        </Text>
                    </View>
                ) : (
                    filteredTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onPress={() => handleTaskPress(task.id)}
                        />
                    ))
                )}

                {/* Bottom Padding */}
                <View className="h-6" />
            </ScrollView>
        </SafeAreaView>
    );
}
