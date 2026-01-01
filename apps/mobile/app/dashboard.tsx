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
import { useTasks } from '../contexts/TasksContext';
import { Task } from '../services/api';
import { Logo } from '../components/ui/Logo';
import { BottomNav } from '../components/ui/BottomNav';
import { DashboardSkeleton, TaskCardSkeleton } from '../components/ui/Skeleton';
import {
    Briefcase,
    LogOut,
    User,
    HelpCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';

// Task Card Component - Light themed
const TaskCard = ({ task, onPress }: { task: Task; onPress: () => void }) => {
    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'OPEN':
                // Amber/Yellow 500
                return { backgroundColor: '#f59e0b', textColor: '#ffffff' };
            case 'ACCEPTED':
            case 'IN_PROGRESS':
                return { backgroundColor: '#3b82f6', textColor: '#ffffff' };
            case 'COMPLETED':
            case 'VERIFIED':
                return { backgroundColor: '#22c55e', textColor: '#ffffff' };
            case 'PAID':
                return { backgroundColor: '#22c55e', textColor: '#ffffff' };
            case 'DISPUTED':
                return { backgroundColor: '#ef4444', textColor: '#ffffff' };
            default:
                return { backgroundColor: '#64748b', textColor: '#ffffff' };
        }
    };

    const formatBudget = (budget: number) => {
        return budget.toLocaleString();
    };

    const getTimeDisplay = (date: string) => {
        const created = new Date(date);
        return created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const created = new Date(date);
        const diffMs = now.getTime() - created.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        return created.toLocaleDateString();
    };

    const statusStyle = getStatusBadgeStyle(task.status);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#e2e8f0',
            }}
            activeOpacity={0.8}
        >
            {/* Image */}
            <View style={{ padding: 12, paddingBottom: 0 }}>
                <View style={{
                    width: '100%',
                    height: 160,
                    borderRadius: 12,
                    overflow: 'hidden',
                }}>
                    {task.beforeImages?.length > 0 ? (
                        <Image
                            source={{ uri: task.beforeImages[0] }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#f1f5f9',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Briefcase size={40} color="#94a3b8" />
                        </View>
                    )}
                </View>
            </View>

            {/* Content */}
            <View style={{ padding: 16 }}>
                {/* Title & Budget */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#0f172a',
                        flex: 1,
                        marginRight: 8,
                    }} numberOfLines={1}>
                        {task.title}
                    </Text>
                    <View style={{
                        backgroundColor: '#22c55e',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                    }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                            {formatBudget(task.budget)}
                        </Text>
                    </View>
                </View>

                {/* Description */}
                <Text style={{
                    fontSize: 14,
                    color: '#64748b',
                    marginBottom: 12,
                    lineHeight: 20,
                }} numberOfLines={2}>
                    {task.description || 'No description provided'}
                </Text>

                {/* Status Badges Row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {/* Status Badge */}
                    <View style={{
                        backgroundColor: statusStyle.backgroundColor,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                    }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: statusStyle.textColor }}>
                            {task.status.replace('_', ' ')}
                        </Text>
                    </View>

                    {/* Category Badge - Red */}
                    <View style={{
                        backgroundColor: '#ef4444',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                    }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>
                            {(task.category || 'GENERAL').toUpperCase()}
                        </Text>
                    </View>

                    {/* Time Badge - Dark Blue */}
                    <View style={{
                        backgroundColor: '#1e3a8a',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                    }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>
                            {getTimeDisplay(task.createdAt)}
                        </Text>
                    </View>
                </View>

                {/* User Info Row */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    {/* Client Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#6366f1',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                        }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                                {task.client?.name?.charAt(0).toUpperCase() || 'C'}
                            </Text>
                        </View>
                        <View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }}>
                                {task.client?.name || 'Unknown Client'}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                                {getTimeAgo(task.createdAt)}
                            </Text>
                        </View>
                    </View>

                    {/* Worker Assignment Status */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <HelpCircle size={18} color="#64748b" />
                        <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
                            {task.worker ? task.worker.name : 'Unassigned'}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function Dashboard() {
    const { user, logout, loading: authLoading } = useAuth();
    const { tasks, loading, refreshTasks, activeTasks, completedTasks, fetchTasks } = useTasks();
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'active' | 'all' | 'completed'>('all');

    // Fetch tasks on mount (will use cache if valid)
    useEffect(() => {
        fetchTasks();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshTasks();
        setRefreshing(false);
    }, [refreshTasks]);

    const handleTaskPress = (taskId: string) => {
        // TODO: Navigate to task details
        console.log('Task pressed:', taskId);
        // router.push(`/task/${taskId}`);
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'active') return task.status === 'OPEN' || task.status === 'ACCEPTED' || task.status === 'IN_PROGRESS';
        if (filter === 'completed') return task.status === 'COMPLETED' || task.status === 'VERIFIED' || task.status === 'PAID';
        return true;
    });

    const activeTasksCount = activeTasks.length;
    const completedTasksCount = completedTasks.length;

    if (authLoading || loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                <StatusBar style="dark" />
                <DashboardSkeleton />
                <BottomNav
                    activeTab="dashboard"
                    onTabPress={() => { }}
                    userRole={user?.role}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={{
                backgroundColor: '#ffffff',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#e2e8f0',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Logo width={32} height={32} />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>
                                Hey, {user?.name?.split(' ')[0] || 'Worker'}!
                            </Text>
                            <Text style={{ fontSize: 14, color: '#64748b' }}>
                                {user?.email}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={logout}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: '#f1f5f9',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <LogOut size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{
                        flex: 1,
                        backgroundColor: '#fbbf24',
                        borderRadius: 12,
                        padding: 12,
                    }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#0f172a' }}>
                            {activeTasksCount}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#0f172a' }}>
                            Active Tasks
                        </Text>
                    </View>
                    <View style={{
                        flex: 1,
                        backgroundColor: '#ef4444',
                        borderRadius: 12,
                        padding: 12,
                    }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>
                            {tasks.length}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#ffffff' }}>
                            Total Tasks
                        </Text>
                    </View>
                    <View style={{
                        flex: 1,
                        backgroundColor: '#1e3a8a',
                        borderRadius: 12,
                        padding: 12,
                    }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>
                            {completedTasksCount}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#ffffff' }}>
                            Completed
                        </Text>
                    </View>
                </View>
            </View>

            {/* Filter Bar - 3 Badges */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
                backgroundColor: '#1e3a8a',
            }}>
                <TouchableOpacity
                    onPress={() => setFilter('active')}
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 4,
                        marginRight: 8,
                        backgroundColor: '#ffffff',
                    }}
                >
                    <Text style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: '#0f172a',
                    }}>
                        Active
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setFilter('all')}
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 4,
                        marginRight: 8,
                        backgroundColor: '#ffffff',
                    }}
                >
                    <Text style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: '#0f172a',
                    }}>
                        All Tasks
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setFilter('completed')}
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 4,
                        backgroundColor: '#ffffff',
                    }}
                >
                    <Text style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: '#0f172a',
                    }}>
                        Completed
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Task List */}
            <ScrollView
                style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>
                        Available Tasks
                    </Text>
                    <Text style={{ fontSize: 14, color: '#64748b' }}>
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
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                        <Briefcase size={48} color="#cbd5e1" />
                        <Text style={{ fontSize: 18, fontWeight: '600', color: '#94a3b8', marginTop: 16 }}>
                            No tasks found
                        </Text>
                        <Text style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
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

                {/* Bottom Padding for nav bar */}
                <View style={{ height: 80 }} />
            </ScrollView>

            {/* Bottom Navigation */}
            <BottomNav
                activeTab="dashboard"
                onTabPress={(tab) => {
                    if (tab === 'tasks') router.push('/tasks');
                    if (tab === 'calendar') router.push('/calendar');
                }}
                userRole={user?.role}
            />
        </SafeAreaView>
    );
}
