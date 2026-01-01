import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    Modal,
    Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { tasksAPI, Task } from '../services/api';
import { BottomNav } from '../components/ui/BottomNav';
import { CalendarSkeleton } from '../components/ui/Skeleton';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    X,
    HelpCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_CELL_WIDTH = (SCREEN_WIDTH - 32) / 7;

// Get status color matching web version
const getStatusColor = (status: string) => {
    switch (status) {
        case 'OPEN':
            return '#3b82f6'; // blue-500
        case 'ACCEPTED':
            return '#f59e0b'; // amber-500
        case 'IN_PROGRESS':
            return '#8b5cf6'; // purple-500
        case 'SUBMITTED':
            return '#06b6d4'; // cyan-500
        case 'VERIFIED':
            return '#22c55e'; // green-500
        case 'PAID':
            return '#10b981'; // emerald-500
        case 'DISPUTED':
            return '#ef4444'; // red-500
        case 'CANCELLED':
            return '#64748b'; // slate-500
        default:
            return '#64748b';
    }
};

// Task bar shown inside calendar cell
const TaskBar = ({ task }: { task: Task }) => (
    <View style={{
        backgroundColor: getStatusColor(task.status),
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
        marginBottom: 2,
    }}>
        <Text style={{ fontSize: 9, color: '#ffffff', fontWeight: '600' }} numberOfLines={1}>
            {task.title}
        </Text>
    </View>
);

// Task Card for the side panel / modal
const TaskCard = ({ task }: { task: Task }) => {
    const formatTime = (deadline: string) => {
        const date = new Date(deadline);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
    };

    return (
        <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#e2e8f0',
        }}>
            {/* Status and Time Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{
                    backgroundColor: getStatusColor(task.status),
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 4,
                }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                        {task.status.replace('_', ' ')}
                    </Text>
                </View>
                {task.deadline && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                        <Clock size={12} color="#64748b" />
                        <Text style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>
                            {formatTime(task.deadline)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Title */}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                {task.title}
            </Text>

            {/* Description */}
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 }} numberOfLines={2}>
                {task.description || 'No description provided'}
            </Text>

            {/* Budget and User Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{
                    backgroundColor: '#fbbf24',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 4,
                }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                        {task.budget.toLocaleString()}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: '#22c55e',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 6,
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                            {task.client?.name?.charAt(0).toUpperCase() || 'T'}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>
                        {task.client?.name?.split(' ')[0] || 'Test'}
                    </Text>
                </View>
            </View>

            {/* Location */}
            {task.location?.address && (
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9',
                }}>
                    <MapPin size={12} color="#64748b" />
                    <Text style={{ fontSize: 11, color: '#64748b', marginLeft: 4, flex: 1 }} numberOfLines={1}>
                        {task.location.address}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default function CalendarScreen() {
    const { user, loading: authLoading } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [showTasksModal, setShowTasksModal] = useState(false);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

    const fetchTasks = async () => {
        if (!user) return;
        try {
            const role = user.role === 'CLIENT' ? 'client' : 'worker';
            const data = await tasksAPI.getMyTasks(role);
            setTasks(data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [user]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTasks();
    }, [user]);

    // Calendar navigation
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    // Get calendar grid data
    const getCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const startingDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        const days: (Date | null)[] = [];

        // Add empty slots for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    // Get tasks for a specific date
    const getTasksForDate = (date: Date): Task[] => {
        return tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline);
            return (
                taskDate.getFullYear() === date.getFullYear() &&
                taskDate.getMonth() === date.getMonth() &&
                taskDate.getDate() === date.getDate()
            );
        });
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        );
    };

    const isSelected = (date: Date) => {
        if (!selectedDate) return false;
        return (
            date.getFullYear() === selectedDate.getFullYear() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getDate() === selectedDate.getDate()
        );
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const calendarDays = getCalendarDays();
    const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

    const handleDayPress = (date: Date) => {
        setSelectedDate(date);
        const tasksForDay = getTasksForDate(date);
        if (tasksForDay.length > 0) {
            setShowTasksModal(true);
        }
    };

    const formatSelectedDate = () => {
        if (!selectedDate) return '';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[selectedDate.getDay()]}, ${months[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
    };

    if (authLoading || loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                <StatusBar style="dark" />
                <CalendarSkeleton />
                <BottomNav
                    activeTab="calendar"
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a' }}>
                            Calendar
                        </Text>
                        <Text style={{ fontSize: 13, color: '#64748b' }}>
                            Track and organize your tasks
                        </Text>
                    </View>

                    {/* Month/Week Toggle */}
                    <View style={{
                        flexDirection: 'row',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        overflow: 'hidden',
                    }}>
                        <TouchableOpacity
                            onPress={() => setViewMode('month')}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                backgroundColor: viewMode === 'month' ? '#6366f1' : '#ffffff',
                            }}
                        >
                            <Text style={{
                                fontSize: 13,
                                fontWeight: '600',
                                color: viewMode === 'month' ? '#ffffff' : '#64748b',
                            }}>
                                Month
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setViewMode('week')}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                backgroundColor: viewMode === 'week' ? '#6366f1' : '#ffffff',
                            }}
                        >
                            <Text style={{
                                fontSize: 13,
                                fontWeight: '600',
                                color: viewMode === 'week' ? '#ffffff' : '#64748b',
                            }}>
                                Week
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#6366f1"
                    />
                }
            >
                {/* Calendar Card */}
                <View style={{
                    backgroundColor: '#ffffff',
                    margin: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    overflow: 'hidden',
                }}>
                    {/* Month Navigation */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f1f5f9',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity
                                onPress={goToPreviousMonth}
                                style={{ padding: 8 }}
                            >
                                <ChevronLeft size={20} color="#64748b" />
                            </TouchableOpacity>

                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginHorizontal: 8 }}>
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </Text>

                            <TouchableOpacity
                                onPress={goToNextMonth}
                                style={{ padding: 8 }}
                            >
                                <ChevronRight size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={goToToday}
                            style={{
                                backgroundColor: '#f1f5f9',
                                paddingHorizontal: 14,
                                paddingVertical: 6,
                                borderRadius: 6,
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b' }}>
                                Today
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Day Headers */}
                    <View style={{
                        flexDirection: 'row',
                        borderBottomWidth: 1,
                        borderBottomColor: '#f1f5f9',
                    }}>
                        {dayNames.map((day, index) => (
                            <View
                                key={index}
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                }}
                            >
                                <Text style={{
                                    fontSize: 12,
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                }}>
                                    {day}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {calendarDays.map((date, index) => {
                            if (!date) {
                                return (
                                    <View
                                        key={`empty-${index}`}
                                        style={{
                                            width: `${100 / 7}%`,
                                            minHeight: 80,
                                            borderRightWidth: index % 7 !== 6 ? 1 : 0,
                                            borderBottomWidth: 1,
                                            borderColor: '#f1f5f9',
                                        }}
                                    />
                                );
                            }

                            const dayTasks = getTasksForDate(date);
                            const isTodayDate = isToday(date);
                            const isSelectedDate = isSelected(date);

                            return (
                                <TouchableOpacity
                                    key={date.toISOString()}
                                    onPress={() => handleDayPress(date)}
                                    style={{
                                        width: `${100 / 7}%`,
                                        minHeight: 80,
                                        padding: 4,
                                        borderRightWidth: index % 7 !== 6 ? 1 : 0,
                                        borderBottomWidth: 1,
                                        borderColor: '#f1f5f9',
                                        backgroundColor: isSelectedDate ? '#eef2ff' : 'transparent',
                                    }}
                                >
                                    {/* Day Number */}
                                    <View style={{
                                        alignItems: 'flex-start',
                                        marginBottom: 4,
                                    }}>
                                        <View style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: isTodayDate ? '#6366f1' : 'transparent',
                                            borderWidth: isTodayDate ? 0 : (isSelectedDate ? 2 : 0),
                                            borderColor: '#6366f1',
                                        }}>
                                            <Text style={{
                                                fontSize: 13,
                                                fontWeight: isTodayDate || isSelectedDate ? '700' : '500',
                                                color: isTodayDate
                                                    ? '#ffffff'
                                                    : isSelectedDate
                                                        ? '#6366f1'
                                                        : '#374151',
                                            }}>
                                                {date.getDate()}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Task Bars */}
                                    <View style={{ flex: 1 }}>
                                        {dayTasks.slice(0, 2).map((task, i) => (
                                            <TaskBar key={task.id || i} task={task} />
                                        ))}
                                        {dayTasks.length > 2 && (
                                            <Text style={{ fontSize: 9, color: '#64748b' }}>
                                                +{dayTasks.length - 2} more
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Bottom Padding */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Tasks Modal - Side Panel Style */}
            <Modal
                visible={showTasksModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTasksModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    justifyContent: 'flex-end',
                }}>
                    <View style={{
                        backgroundColor: '#ffffff',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        maxHeight: '75%',
                    }}>
                        {/* Modal Header */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 20,
                            paddingVertical: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: '#f1f5f9',
                        }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>
                                Tasks for {formatSelectedDate()}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowTasksModal(false)}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#f1f5f9',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <X size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Content */}
                        <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                            {selectedDateTasks.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#94a3b8' }}>
                                        No tasks scheduled
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                                        Select another date or create a new task
                                    </Text>
                                </View>
                            ) : (
                                selectedDateTasks.map(task => (
                                    <TaskCard key={task.id} task={task} />
                                ))
                            )}
                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Bottom Navigation */}
            <BottomNav
                activeTab="calendar"
                onTabPress={(tab) => {
                    if (tab === 'dashboard') router.push('/dashboard');
                }}
                userRole={user?.role}
            />
        </SafeAreaView>
    );
}
