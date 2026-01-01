import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    Modal,
    Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { Task } from '../services/api';
import { BottomNav } from '../components/ui/BottomNav';
import { CalendarSkeleton } from '../components/ui/Skeleton';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    X,
    DollarSign,
    User,
} from 'lucide-react-native';
import { router } from 'expo-router';

// Brand colors
const BRAND_COLORS = {
    primary: '#1e3a8a',      // Dark blue
    secondary: '#fbbf24',    // Amber/Yellow
    accent: '#ef4444',       // Red
    success: '#22c55e',      // Green
};

// Get status color with brand colors
const getStatusColor = (status: string) => {
    switch (status) {
        case 'OPEN':
            return BRAND_COLORS.secondary; // amber
        case 'ACCEPTED':
            return BRAND_COLORS.primary; // dark blue
        case 'IN_PROGRESS':
            return '#8b5cf6'; // purple
        case 'SUBMITTED':
            return '#06b6d4'; // cyan
        case 'VERIFIED':
            return BRAND_COLORS.success; // green
        case 'PAID':
            return '#10b981'; // emerald
        case 'DISPUTED':
            return BRAND_COLORS.accent; // red
        case 'CANCELLED':
            return '#64748b'; // slate
        default:
            return BRAND_COLORS.primary;
    }
};

// Format time helper
const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Format date for section header
const formatDateHeader = (date: Date) => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return `${days[date.getDay()]} ${date.getDate()}`;
};

// Event Card Component
const EventCard = ({ task, onPress }: { task: Task; onPress: () => void }) => {
    const statusColor = getStatusColor(task.status);

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                flexDirection: 'row',
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
                backgroundColor: '#ffffff',
            }}
        >
            {/* Time Column */}
            <View style={{ width: 55, marginRight: 12 }}>
                {task.deadline && (
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                        {formatTime(task.deadline)}
                    </Text>
                )}
            </View>

            {/* Color Indicator Bar */}
            <View style={{
                width: 4,
                borderRadius: 2,
                backgroundColor: statusColor,
                marginRight: 12,
            }} />

            {/* Content */}
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 2 }}>
                    {task.title}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b' }} numberOfLines={1}>
                    {task.description || task.category || 'No description'}
                </Text>
            </View>

            {/* Budget Badge */}
            <View style={{
                backgroundColor: BRAND_COLORS.success,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                alignSelf: 'center',
            }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                    ₹{task.budget?.toLocaleString()}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

// Day with Events grouped
const DaySection = ({ date, tasks, onTaskPress }: { date: Date; tasks: Task[]; onTaskPress: (task: Task) => void }) => {
    if (tasks.length === 0) return null;

    return (
        <View style={{ marginBottom: 8 }}>
            {/* Date Header */}
            <View style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: '#f8fafc',
            }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: BRAND_COLORS.primary, letterSpacing: 0.5 }}>
                    {formatDateHeader(date)}
                </Text>
            </View>

            {/* Events */}
            <View style={{ backgroundColor: '#ffffff' }}>
                {tasks.map(task => (
                    <EventCard
                        key={task.id}
                        task={task}
                        onPress={() => onTaskPress(task)}
                    />
                ))}
            </View>
        </View>
    );
};

// Task Detail Modal
const TaskDetailModal = ({ task, visible, onClose }: { task: Task | null; visible: boolean; onClose: () => void }) => {
    if (!task) return null;

    const statusColor = getStatusColor(task.status);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'flex-end',
            }}>
                <View style={{
                    backgroundColor: '#ffffff',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    maxHeight: '85%',
                }}>
                    {/* Modal Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#e2e8f0',
                        backgroundColor: BRAND_COLORS.primary,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff' }}>
                            Task Details
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <X size={18} color="#ffffff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                        {/* Task Image */}
                        {task.beforeImages && task.beforeImages.length > 0 && (
                            <View style={{
                                width: '100%',
                                height: 180,
                                borderRadius: 12,
                                overflow: 'hidden',
                                marginBottom: 16,
                                backgroundColor: '#f1f5f9',
                            }}>
                                <Image
                                    source={{ uri: task.beforeImages[0] }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            </View>
                        )}

                        {/* Title */}
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
                            {task.title}
                        </Text>

                        {/* Status & Category Badges */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            <View style={{
                                backgroundColor: statusColor,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                            }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                                    {task.status.replace('_', ' ')}
                                </Text>
                            </View>
                            <View style={{
                                backgroundColor: BRAND_COLORS.accent,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                            }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                                    {(task.category || 'GENERAL').toUpperCase()}
                                </Text>
                            </View>
                            <View style={{
                                backgroundColor: BRAND_COLORS.success,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                            }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                                    ₹{task.budget?.toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        {/* Description */}
                        <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 22, marginBottom: 20 }}>
                            {task.description || 'No description provided.'}
                        </Text>

                        {/* Info Cards */}
                        <View style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16,
                        }}>
                            {/* Deadline */}
                            {task.deadline && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        backgroundColor: BRAND_COLORS.primary,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12,
                                    }}>
                                        <Clock size={18} color="#ffffff" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Deadline</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}>
                                            {new Date(task.deadline).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Client */}
                            {task.client && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        backgroundColor: BRAND_COLORS.secondary,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12,
                                    }}>
                                        <User size={18} color="#0f172a" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Client</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}>
                                            {task.client.name}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Location */}
                            {task.locationName && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        backgroundColor: BRAND_COLORS.accent,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12,
                                    }}>
                                        <MapPin size={18} color="#ffffff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Location</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }} numberOfLines={2}>
                                            {task.locationName}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Bottom Spacing */}
                        <View style={{ height: 32 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default function CalendarScreen() {
    const { user, loading: authLoading } = useAuth();
    const { tasks, loading, refreshTasks, fetchTasks, getTasksForDate } = useTasks();
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showTaskModal, setShowTaskModal] = useState(false);

    // Fetch tasks on mount (will use cache if valid)
    useEffect(() => {
        fetchTasks();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshTasks();
        setRefreshing(false);
    }, [refreshTasks]);

    // Calendar navigation
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
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

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
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
        return selectedDates.some(d =>
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate()
        );
    };

    const hasTasksOnDate = (date: Date) => {
        return getTasksForDate(date).length > 0;
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const calendarDays = getCalendarDays();

    const handleDayPress = (date: Date) => {
        setSelectedDates([date]);
    };

    const handleTaskPress = (task: Task) => {
        setSelectedTask(task);
        setShowTaskModal(true);
    };

    // Get events for selected dates
    const getSelectedDateEvents = () => {
        const events: { date: Date; tasks: Task[] }[] = [];
        const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

        sortedDates.forEach(date => {
            const dayTasks = getTasksForDate(date);
            if (dayTasks.length > 0) {
                events.push({ date, tasks: dayTasks });
            }
        });

        return events;
    };

    // Get upcoming events (next 7 days)
    const getUpcomingEvents = () => {
        const events: { date: Date; tasks: Task[] }[] = [];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
            const dayTasks = getTasksForDate(date);
            if (dayTasks.length > 0) {
                events.push({ date, tasks: dayTasks });
            }
        }

        return events;
    };

    const selectedEvents = getSelectedDateEvents();
    const upcomingEvents = selectedEvents.length > 0 ? selectedEvents : getUpcomingEvents();

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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <StatusBar style="dark" />

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={BRAND_COLORS.primary}
                    />
                }
            >
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingTop: 16,
                    paddingBottom: 20,
                }}>
                    {/* Month Navigation */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#0f172a' }}>
                            {monthNames[currentDate.getMonth()]}
                        </Text>
                        <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                            <TouchableOpacity
                                onPress={goToPreviousMonth}
                                style={{ padding: 4 }}
                            >
                                <ChevronLeft size={20} color={BRAND_COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={goToNextMonth}
                                style={{ padding: 4 }}
                            >
                                <ChevronRight size={20} color={BRAND_COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Year */}
                    <Text style={{ fontSize: 14, color: '#94a3b8', fontWeight: '600' }}>
                        {currentDate.getFullYear()}
                    </Text>
                </View>

                {/* Calendar Grid */}
                <View style={{ paddingHorizontal: 16 }}>
                    {/* Day Headers */}
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        {dayNames.map((day, index) => (
                            <View
                                key={index}
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    paddingVertical: 8,
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

                    {/* Calendar Days */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {calendarDays.map((date, index) => {
                            if (!date) {
                                return (
                                    <View
                                        key={`empty-${index}`}
                                        style={{
                                            width: `${100 / 7}%`,
                                            aspectRatio: 1,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    />
                                );
                            }

                            const isTodayDate = isToday(date);
                            const isSelectedDate = isSelected(date);
                            const hasTasks = hasTasksOnDate(date);

                            return (
                                <TouchableOpacity
                                    key={date.toISOString()}
                                    onPress={() => handleDayPress(date)}
                                    style={{
                                        width: `${100 / 7}%`,
                                        aspectRatio: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isTodayDate ? BRAND_COLORS.primary : 'transparent',
                                        borderWidth: isSelectedDate && !isTodayDate ? 2 : (hasTasks && !isTodayDate ? 2 : 0),
                                        borderColor: isSelectedDate ? BRAND_COLORS.secondary : BRAND_COLORS.secondary,
                                    }}>
                                        <Text style={{
                                            fontSize: 14,
                                            fontWeight: isTodayDate || isSelectedDate || hasTasks ? '600' : '400',
                                            color: isTodayDate
                                                ? '#ffffff'
                                                : isSelectedDate || hasTasks
                                                    ? BRAND_COLORS.primary
                                                    : '#374151',
                                        }}>
                                            {date.getDate()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Divider */}
                <View style={{
                    height: 1,
                    backgroundColor: '#e2e8f0',
                    marginTop: 20,
                }} />

                {/* Events List */}
                <View style={{ paddingTop: 8, paddingBottom: 100 }}>
                    {upcomingEvents.length === 0 ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center' }}>
                                No events scheduled
                            </Text>
                            <Text style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4, textAlign: 'center' }}>
                                Tap a date to see tasks
                            </Text>
                        </View>
                    ) : (
                        upcomingEvents.map((event) => (
                            <DaySection
                                key={event.date.toISOString()}
                                date={event.date}
                                tasks={event.tasks}
                                onTaskPress={handleTaskPress}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Task Detail Modal */}
            <TaskDetailModal
                task={selectedTask}
                visible={showTaskModal}
                onClose={() => setShowTaskModal(false)}
            />

            {/* Bottom Navigation */}
            <BottomNav
                activeTab="calendar"
                onTabPress={(tab) => {
                    if (tab === 'dashboard') router.push('/dashboard');
                    if (tab === 'tasks') router.push('/tasks');
                }}
                userRole={user?.role}
            />
        </SafeAreaView>
    );
}
