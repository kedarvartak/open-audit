import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Linking,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import {
    X,
    ChevronLeft,
    ChevronRight,
    Calendar,
    MapPin,
    ExternalLink,
    Clock,
    Navigation,
    Play,
    AlertCircle,
    Camera,
} from 'lucide-react-native';
import { tasksAPI, Task, transformImageUrl } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../contexts/TasksContext';
import { useLocation } from '../../hooks/useLocation';
import { router } from 'expo-router';

interface TaskDetailsModalProps {
    taskId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const TaskDetailsModal = ({
    taskId,
    isOpen,
    onClose,
    onTaskUpdated,
}: TaskDetailsModalProps) => {
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [startingWork, setStartingWork] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { user } = useAuth();
    const { getTaskById } = useTasks();
    const location = useLocation();

    useEffect(() => {
        if (isOpen && taskId) {
            // Try to get cached task immediately for instant display
            const cachedTask = getTaskById(taskId);
            if (cachedTask) {
                setTask(cachedTask);
                setLoading(false);
                // Still fetch fresh data in background
                fetchTaskInBackground();
            } else {
                fetchTask();
            }
        } else {
            // Reset state when modal closes
            setTask(null);
            setCurrentImageIndex(0);
        }
    }, [isOpen, taskId]);

    const fetchTaskInBackground = async () => {
        if (!taskId) return;
        try {
            // Force refresh to get latest data
            const taskData = await tasksAPI.getTask(taskId, true);
            setTask(taskData);
        } catch (error) {
            // Silent fail for background refresh - we already have cached data
            console.log('[TaskDetailsModal] Background refresh failed:', error);
        }
    };

    const fetchTask = async () => {
        if (!taskId) return;
        try {
            setLoading(true);
            const taskData = await tasksAPI.getTask(taskId);
            setTask(taskData);
        } catch (error) {
            console.error('Failed to fetch task:', error);
            Alert.alert('Error', 'Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!taskId) return;
        try {
            setAccepting(true);
            await tasksAPI.acceptTask(taskId);
            Alert.alert('Success', 'Task accepted successfully!');
            fetchTask();
            onTaskUpdated?.();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept task');
        } finally {
            setAccepting(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateStr} at ${timeStr}`;
    };

    const openLocation = () => {
        if (task?.locationName || task?.location?.address) {
            const address = task.locationName || task.location?.address;
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address!)}`;
            Linking.openURL(url);
        }
    };

    const canAccept = user?.role === 'WORKER' && task?.status === 'OPEN' && task?.client.id !== user?.id;
    const isAssignedWorker = user?.role === 'WORKER' && task?.worker?.id === user?.id;
    const canBeginWork = isAssignedWorker && task?.status === 'ACCEPTED';
    const canUploadImages = isAssignedWorker && task?.status === 'IN_PROGRESS';

    // Calculate time status for Begin Task button
    const timeStatus = useMemo(() => {
        if (!task?.deadline && !task?.scheduledFor) {
            // No deadline set - can start anytime
            return { canStart: true, reason: null, timeUntil: null };
        }

        const scheduledTime = task.scheduledFor ? new Date(task.scheduledFor) : new Date(task.deadline!);
        const now = new Date();
        const diffMs = scheduledTime.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);
        const diffHours = diffMs / (1000 * 60 * 60);

        // If more than 2 hours before scheduled time, disable button
        if (diffHours > 2) {
            const hours = Math.floor(diffHours);
            const mins = Math.floor((diffHours - hours) * 60);
            return {
                canStart: false,
                reason: 'too_early',
                timeUntil: `${hours}h ${mins}m until scheduled time`,
            };
        }

        // Within 2 hours or past scheduled time - can attempt to start (needs location check)
        return { canStart: true, reason: null, timeUntil: null };
    }, [task?.deadline, task?.scheduledFor]);

    // Handle Begin Task with location verification
    const handleBeginTask = async () => {
        if (!task || !taskId) return;

        // Get task location
        const taskLat = task.locationLat || task.location?.latitude;
        const taskLng = task.locationLng || task.location?.longitude;
        const taskRadius = task.locationRadius || 200; // Default 200 meters

        if (!taskLat || !taskLng) {
            // No location set for task - allow starting without location check
            Alert.alert(
                'Start Work',
                'This task has no specific location. Do you want to begin work?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Begin',
                        onPress: () => startWork(0, 0),
                    },
                ]
            );
            return;
        }

        setStartingWork(true);

        try {
            // Get current location
            const currentLocation = await location.getCurrentLocation();

            if (!currentLocation) {
                setStartingWork(false);
                return;
            }

            // Calculate distance
            const distance = location.calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                taskLat,
                taskLng
            );

            console.log(`[BeginTask] Distance to task: ${distance.toFixed(0)}m, Radius: ${taskRadius}m`);

            if (distance <= taskRadius) {
                // Within radius - can start work
                await startWork(currentLocation.latitude, currentLocation.longitude);
            } else {
                // Outside radius - show alert
                Alert.alert(
                    'Too Far From Location',
                    `You are ${Math.round(distance)}m away from the task location. You need to be within ${taskRadius}m to begin work.\n\nPlease travel to the location and try again.`,
                    [
                        { text: 'OK', style: 'default' },
                        {
                            text: 'Navigate',
                            onPress: openLocation,
                        },
                    ]
                );
            }
        } catch (error) {
            console.error('[BeginTask] Error:', error);
            Alert.alert('Error', 'Failed to verify your location. Please try again.');
        } finally {
            setStartingWork(false);
        }
    };

    const startWork = async (workerLat: number, workerLng: number) => {
        if (!taskId) return;

        try {
            await tasksAPI.startWork(taskId, workerLat, workerLng);
            onClose(); // Close modal
            onTaskUpdated?.();
            // Navigate to work upload screen
            router.push(`/work-upload?taskId=${taskId}`);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to start work');
        }
    };

    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'OPEN':
                return { backgroundColor: '#f59e0b' };
            case 'ACCEPTED':
            case 'IN_PROGRESS':
                return { backgroundColor: '#3b82f6' };
            case 'COMPLETED':
            case 'VERIFIED':
            case 'PAID':
                return { backgroundColor: '#22c55e' };
            case 'DISPUTED':
                return { backgroundColor: '#ef4444' };
            default:
                return { backgroundColor: '#64748b' };
        }
    };

    const nextImage = () => {
        if (task?.beforeImages && task.beforeImages.length > 1) {
            setCurrentImageIndex((prev) =>
                prev === task.beforeImages.length - 1 ? 0 : prev + 1
            );
        }
    };

    const prevImage = () => {
        if (task?.beforeImages && task.beforeImages.length > 1) {
            setCurrentImageIndex((prev) =>
                prev === 0 ? task.beforeImages.length - 1 : prev - 1
            );
        }
    };

    const renderSkeleton = () => (
        <View style={{ padding: 20 }}>
            {/* Image skeleton */}
            <View style={{
                width: '100%',
                height: 200,
                backgroundColor: '#e2e8f0',
                borderRadius: 12,
                marginBottom: 16,
            }} />

            {/* Title skeleton */}
            <View style={{
                width: '75%',
                height: 28,
                backgroundColor: '#e2e8f0',
                borderRadius: 6,
                marginBottom: 12,
            }} />

            {/* Badges skeleton */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <View style={{ width: 60, height: 24, backgroundColor: '#e2e8f0', borderRadius: 4 }} />
                <View style={{ width: 80, height: 24, backgroundColor: '#e2e8f0', borderRadius: 4 }} />
                <View style={{ width: 70, height: 24, backgroundColor: '#e2e8f0', borderRadius: 4 }} />
            </View>

            {/* Description skeleton */}
            <View style={{ gap: 8 }}>
                <View style={{ width: '100%', height: 14, backgroundColor: '#e2e8f0', borderRadius: 4 }} />
                <View style={{ width: '100%', height: 14, backgroundColor: '#e2e8f0', borderRadius: 4 }} />
                <View style={{ width: '60%', height: 14, backgroundColor: '#e2e8f0', borderRadius: 4 }} />
            </View>
        </View>
    );

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingTop: 16,
                    paddingBottom: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#e2e8f0',
                }}>
                    <Text style={{
                        fontSize: 20,
                        fontWeight: '700',
                        color: '#0f172a',
                    }}>
                        Task Details
                    </Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={{
                            padding: 8,
                            backgroundColor: '#f1f5f9',
                            borderRadius: 20,
                        }}
                    >
                        <X size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {loading ? (
                        renderSkeleton()
                    ) : !task ? (
                        <View style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 60,
                        }}>
                            <Text style={{ color: '#64748b', fontSize: 16 }}>
                                Task not found
                            </Text>
                        </View>
                    ) : (
                        <View style={{ padding: 20 }}>
                            {/* Image Carousel */}
                            <View style={{
                                width: '100%',
                                height: 220,
                                borderRadius: 16,
                                overflow: 'hidden',
                                backgroundColor: '#f1f5f9',
                                marginBottom: 20,
                            }}>
                                {task.beforeImages && task.beforeImages.length > 0 ? (
                                    <>
                                        <Image
                                            source={{ uri: transformImageUrl(task.beforeImages[currentImageIndex]) }}
                                            style={{ width: '100%', height: '100%' }}
                                            contentFit="cover"
                                        />

                                        {/* Navigation Arrows */}
                                        {task.beforeImages.length > 1 && (
                                            <>
                                                <TouchableOpacity
                                                    onPress={prevImage}
                                                    style={{
                                                        position: 'absolute',
                                                        left: 12,
                                                        top: '50%',
                                                        transform: [{ translateY: -20 }],
                                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                                        borderRadius: 20,
                                                        padding: 8,
                                                    }}
                                                >
                                                    <ChevronLeft size={20} color="#1e293b" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={nextImage}
                                                    style={{
                                                        position: 'absolute',
                                                        right: 12,
                                                        top: '50%',
                                                        transform: [{ translateY: -20 }],
                                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                                        borderRadius: 20,
                                                        padding: 8,
                                                    }}
                                                >
                                                    <ChevronRight size={20} color="#1e293b" />
                                                </TouchableOpacity>

                                                {/* Dots Indicator */}
                                                <View style={{
                                                    position: 'absolute',
                                                    bottom: 12,
                                                    left: 0,
                                                    right: 0,
                                                    flexDirection: 'row',
                                                    justifyContent: 'center',
                                                    gap: 6,
                                                }}>
                                                    {task.beforeImages.map((_, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            onPress={() => setCurrentImageIndex(index)}
                                                            style={{
                                                                width: index === currentImageIndex ? 16 : 8,
                                                                height: 8,
                                                                borderRadius: 4,
                                                                backgroundColor: index === currentImageIndex ? '#464ace' : 'rgba(255,255,255,0.7)',
                                                            }}
                                                        />
                                                    ))}
                                                </View>

                                                {/* Image Counter */}
                                                <View style={{
                                                    position: 'absolute',
                                                    top: 12,
                                                    right: 12,
                                                    backgroundColor: '#464ace',
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 4,
                                                    borderRadius: 12,
                                                }}>
                                                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>
                                                        {currentImageIndex + 1} / {task.beforeImages.length}
                                                    </Text>
                                                </View>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <View style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Text style={{ color: '#94a3b8', fontSize: 14 }}>No images</Text>
                                    </View>
                                )}
                            </View>

                            {/* Tags & Budget Row */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 16,
                            }}>
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                                    <View style={{
                                        ...getStatusBadgeStyle(task.status),
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 4,
                                    }}>
                                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>
                                            {task.status}
                                        </Text>
                                    </View>
                                    <View style={{
                                        backgroundColor: '#ef4444',
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 4,
                                    }}>
                                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>
                                            {task.category.toUpperCase()}
                                        </Text>
                                    </View>
                                    {task.worker && (
                                        <View style={{
                                            backgroundColor: '#22c55e',
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 4,
                                        }}>
                                            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>
                                                {task.worker.name}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={{
                                    backgroundColor: '#22c55e',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                }}>
                                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                                        ₹{task.budget.toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            {/* Title */}
                            <Text style={{
                                fontSize: 22,
                                fontWeight: '700',
                                color: '#0f172a',
                                marginBottom: 12,
                            }}>
                                {task.title}
                            </Text>

                            {/* Description */}
                            <Text style={{
                                fontSize: 15,
                                color: '#475569',
                                lineHeight: 22,
                                marginBottom: 20,
                            }}>
                                {task.description}
                            </Text>

                            {/* Location */}
                            {task.location?.address && (
                                <TouchableOpacity
                                    onPress={openLocation}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#f8fafc',
                                        padding: 16,
                                        borderRadius: 12,
                                        marginBottom: 16,
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0',
                                    }}
                                >
                                    <MapPin size={20} color="#464ace" />
                                    <Text style={{
                                        flex: 1,
                                        fontSize: 14,
                                        color: '#334155',
                                        marginLeft: 12,
                                    }} numberOfLines={2}>
                                        {task.location.address}
                                    </Text>
                                    <ExternalLink size={16} color="#94a3b8" />
                                </TouchableOpacity>
                            )}

                            {/* Deadline */}
                            {task.deadline && (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#464ace',
                                    padding: 14,
                                    borderRadius: 12,
                                    marginBottom: 16,
                                }}>
                                    <Calendar size={18} color="#ffffff" />
                                    <Text style={{
                                        fontSize: 14,
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        marginLeft: 10,
                                    }}>
                                        {formatDateTime(task.deadline)}
                                    </Text>
                                </View>
                            )}

                            {/* Divider */}
                            <View style={{
                                height: 1,
                                backgroundColor: '#e2e8f0',
                                marginVertical: 16,
                            }} />

                            {/* Client Info */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: '#464ace',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Text style={{
                                            color: '#ffffff',
                                            fontSize: 16,
                                            fontWeight: '700',
                                        }}>
                                            {task.client.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={{
                                        fontSize: 15,
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        marginLeft: 12,
                                    }}>
                                        {task.client.name}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Calendar size={14} color="#94a3b8" />
                                    <Text style={{
                                        fontSize: 13,
                                        color: '#94a3b8',
                                        marginLeft: 6,
                                    }}>
                                        {formatDate(task.createdAt)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Accept Button - Fixed at bottom */}
                {canAccept && task && (
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 20,
                        backgroundColor: '#ffffff',
                        borderTopWidth: 1,
                        borderTopColor: '#e2e8f0',
                    }}>
                        <TouchableOpacity
                            onPress={handleAccept}
                            disabled={accepting}
                            style={{
                                backgroundColor: accepting ? '#94a3b8' : '#f59e0b',
                                paddingVertical: 16,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {accepting ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={{
                                    color: '#0f172a',
                                    fontSize: 16,
                                    fontWeight: '700',
                                }}>
                                    ACCEPT TASK
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Begin Task Button - For assigned workers */}
                {canBeginWork && task && (
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 20,
                        backgroundColor: '#ffffff',
                        borderTopWidth: 1,
                        borderTopColor: '#e2e8f0',
                    }}>
                        {/* Time warning if too early */}
                        {!timeStatus.canStart && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#fef3c7',
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 12,
                            }}>
                                <Clock size={18} color="#d97706" />
                                <Text style={{
                                    marginLeft: 8,
                                    color: '#92400e',
                                    fontSize: 13,
                                    flex: 1,
                                }}>
                                    {timeStatus.timeUntil}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={handleBeginTask}
                            disabled={!timeStatus.canStart || startingWork}
                            style={{
                                backgroundColor: !timeStatus.canStart ? '#cbd5e1' : startingWork ? '#94a3b8' : '#22c55e',
                                paddingVertical: 16,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                        >
                            {startingWork ? (
                                <>
                                    <ActivityIndicator color="#ffffff" size="small" />
                                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                                        VERIFYING LOCATION...
                                    </Text>
                                </>
                            ) : !timeStatus.canStart ? (
                                <>
                                    <AlertCircle size={20} color="#64748b" />
                                    <Text style={{ color: '#64748b', fontSize: 16, fontWeight: '700' }}>
                                        TOO EARLY TO START
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Play size={20} color="#ffffff" />
                                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                                        BEGIN TASK
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {timeStatus.canStart && (
                            <Text style={{
                                textAlign: 'center',
                                color: '#64748b',
                                fontSize: 11,
                                marginTop: 8,
                            }}>
                                Location verification required to begin
                            </Text>
                        )}
                    </View>
                )}

                {/* Upload Images Button - For tasks in progress */}
                {canUploadImages && task && (
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 20,
                        backgroundColor: '#ffffff',
                        borderTopWidth: 1,
                        borderTopColor: '#e2e8f0',
                    }}>
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                router.push(`/work-upload?taskId=${taskId}`);
                            }}
                            style={{
                                backgroundColor: '#464ace',
                                paddingVertical: 16,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                        >
                            <Camera size={20} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                                UPLOAD WORK IMAGES
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
};
