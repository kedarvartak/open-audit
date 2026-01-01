import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { Task } from '../services/api';
import { BottomNav } from '../components/ui/BottomNav';
import { TaskCardSkeleton } from '../components/ui/Skeleton';
import { Logo } from '../components/ui/Logo';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Status color helper
const getStatusColor = (status: string) => {
    switch (status) {
        case 'OPEN':
            return { bg: '#fbbf24', text: '#0f172a' }; // amber-400
        case 'ACCEPTED':
            return { bg: '#6366f1', text: '#ffffff' }; // indigo
        case 'EN_ROUTE':
            return { bg: '#f97316', text: '#ffffff' }; // orange
        case 'ARRIVED':
            return { bg: '#14b8a6', text: '#ffffff' }; // teal
        case 'IN_PROGRESS':
            return { bg: '#8b5cf6', text: '#ffffff' }; // purple
        case 'SUBMITTED':
            return { bg: '#8b5cf6', text: '#ffffff' }; // purple
        case 'VERIFIED':
        case 'COMPLETED':
        case 'PAID':
            return { bg: '#22c55e', text: '#ffffff' }; // green
        case 'DISPUTED':
            return { bg: '#ef4444', text: '#ffffff' }; // red
        default:
            return { bg: '#64748b', text: '#ffffff' }; // slate
    }
};

// Time since helper
const getTimeSince = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return "Just now";
};

// Format time helper
const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Task Card Component
const TaskCard = ({ task, userRole, onPress }: { task: Task; userRole: string; onPress: () => void }) => {
    const statusStyle = getStatusColor(task.status);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                width: '100%',
                backgroundColor: '#ffffff',
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
            }}
            activeOpacity={0.7}
        >
            {/* Image Banner */}
            <View style={{ padding: 12, paddingBottom: 0 }}>
                <View style={{
                    width: '100%',
                    height: 180,
                    backgroundColor: '#f1f5f9',
                    borderRadius: 12,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {task.beforeImages && task.beforeImages.length > 0 ? (
                        <Image
                            source={{ uri: task.beforeImages[0] }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <Logo width={48} height={48} />
                    )}
                </View>
            </View>

            {/* Card Content */}
            <View style={{ padding: 16, paddingTop: 12 }}>
                {/* Title with Budget */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                    <Text
                        style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 }}
                        numberOfLines={1}
                    >
                        {task.title}
                    </Text>
                    <View style={{
                        backgroundColor: '#22c55e',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                    }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                            ₹{task.budget.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Description */}
                <Text
                    style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 }}
                    numberOfLines={2}
                >
                    {task.description || 'No description provided'}
                </Text>

                {/* Status Badges Row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {/* Status Badge */}
                    <View style={{
                        backgroundColor: statusStyle.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: statusStyle.text }}>
                            {task.status.replace('_', ' ')}
                        </Text>
                    </View>

                    {/* Category Badge */}
                    <View style={{
                        backgroundColor: '#ef4444',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                            {(task.category || 'GENERAL').toUpperCase()}
                        </Text>
                    </View>

                    {/* Action Badge for Worker */}
                    {userRole === 'WORKER' && task.status === 'ACCEPTED' && (
                        <View style={{
                            backgroundColor: '#6366f1',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 6,
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                                Start Work
                            </Text>
                        </View>
                    )}

                    {/* Time Badge */}
                    {task.deadline && (
                        <View style={{
                            backgroundColor: '#1e3a8a',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 6,
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                                {formatTime(task.deadline)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Footer with Avatar */}
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
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                            {userRole === 'CLIENT'
                                ? (task.worker?.name?.charAt(0).toUpperCase() || '?')
                                : (task.client?.name?.charAt(0).toUpperCase() || 'T')}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }} numberOfLines={1}>
                            {userRole === 'CLIENT'
                                ? (task.worker?.name || 'Not assigned')
                                : (task.client?.name || 'Test Client')}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                            {getTimeSince(task.createdAt)}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function TasksScreen() {
    const { user, loading: authLoading } = useAuth();
    const { tasks, loading, refreshTasks, fetchTasks } = useTasks();
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

    // Fetch tasks on mount (will use cache if valid)
    useEffect(() => {
        fetchTasks();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshTasks();
        setRefreshing(false);
    }, [refreshTasks]);

    const filteredTasks = tasks.filter(task => {
        if (filter === 'active') {
            return ['OPEN', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED'].includes(task.status);
        }
        if (filter === 'completed') {
            return ['COMPLETED', 'VERIFIED', 'PAID'].includes(task.status);
        }
        return true;
    });

    const handleTaskPress = (taskId: string) => {
        // Navigate to task detail
        console.log('Navigate to task:', taskId);
        // router.push(`/task/${taskId}`);
    };

    if (authLoading || loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                <StatusBar style="dark" />

                {/* Header Skeleton */}
                <View style={{
                    backgroundColor: '#ffffff',
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#e2e8f0',
                }}>
                    <View style={{ height: 24, width: 120, backgroundColor: '#e2e8f0', borderRadius: 6, marginBottom: 4 }} />
                    <View style={{ height: 14, width: 200, backgroundColor: '#e2e8f0', borderRadius: 4 }} />
                </View>

                {/* Filter Skeleton */}
                <View style={{ flexDirection: 'row', padding: 16, gap: 8 }}>
                    <View style={{ height: 36, width: 90, backgroundColor: '#e2e8f0', borderRadius: 6 }} />
                    <View style={{ height: 36, width: 70, backgroundColor: '#e2e8f0', borderRadius: 6 }} />
                    <View style={{ height: 36, width: 100, backgroundColor: '#e2e8f0', borderRadius: 6 }} />
                </View>

                {/* Cards Skeleton */}
                <View style={{ paddingHorizontal: 16 }}>
                    <TaskCardSkeleton />
                    <TaskCardSkeleton />
                    <TaskCardSkeleton />
                </View>

                <BottomNav
                    activeTab="tasks"
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
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#e2e8f0',
            }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#0f172a' }}>
                    Team Tasks
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    {user?.role === 'CLIENT' ? 'Tasks you have posted' : "View and manage your team's tasks"}
                </Text>
            </View>

            {/* Filter Tabs */}
            <View style={{
                flexDirection: 'row',
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 8,
            }}>
                {[
                    { value: 'all', label: 'ALL TASKS' },
                    { value: 'active', label: 'ACTIVE' },
                    { value: 'completed', label: 'COMPLETED' }
                ].map((tab) => (
                    <TouchableOpacity
                        key={tab.value}
                        onPress={() => setFilter(tab.value as any)}
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 6,
                            backgroundColor: filter === tab.value ? '#6366f1' : '#e2e8f0',
                        }}
                    >
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: filter === tab.value ? '#ffffff' : '#64748b',
                        }}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 100,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#6366f1"
                    />
                }
            >
                {filteredTasks.length === 0 ? (
                    <View style={{
                        backgroundColor: '#e2e8f0',
                        borderRadius: 12,
                        padding: 40,
                        alignItems: 'center',
                        marginTop: 20,
                    }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#64748b' }}>
                            No tasks found
                        </Text>
                        <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                            {filter === 'active' ? 'No active tasks at the moment' :
                                filter === 'completed' ? 'No completed tasks yet' :
                                    'Pull down to refresh'}
                        </Text>
                    </View>
                ) : (
                    <View>
                        {filteredTasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                userRole={user?.role || 'WORKER'}
                                onPress={() => handleTaskPress(task.id)}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Navigation */}
            <BottomNav
                activeTab="tasks"
                onTabPress={(tab) => {
                    if (tab === 'dashboard') router.push('/dashboard');
                    if (tab === 'calendar') router.push('/calendar');
                }}
                userRole={user?.role}
            />
        </SafeAreaView>
    );
}
