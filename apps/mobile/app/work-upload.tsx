import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {
    ArrowLeft,
    Camera,
    ImagePlus,
    Upload,
    X,
    CheckCircle,
    Clock,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { tasksAPI, Task, transformImageUrl } from '../services/api';
import { BottomNav } from '../components/ui/BottomNav';
import { useAuth } from '../contexts/AuthContext';

export default function WorkUploadScreen() {
    const { taskId } = useLocalSearchParams<{ taskId: string }>();
    const { user } = useAuth();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    useEffect(() => {
        if (taskId) {
            fetchTask();
        }
    }, [taskId]);

    const fetchTask = async () => {
        if (!taskId) return;
        try {
            setLoading(true);
            const taskData = await tasksAPI.getTask(taskId, true);
            setTask(taskData);
        } catch (error) {
            console.error('Failed to fetch task:', error);
            Alert.alert('Error', 'Failed to load task details');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const pickImages = async () => {
        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: 10,
            });

            if (!result.canceled && result.assets) {
                const newImages = result.assets.map(asset => asset.uri);
                setSelectedImages(prev => [...prev, ...newImages].slice(0, 10));
            }
        } catch (error) {
            console.error('Error picking images:', error);
            Alert.alert('Error', 'Failed to pick images');
        }
    };

    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow camera access to take photos.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImages(prev => [...prev, result.assets[0].uri].slice(0, 10));
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async (retryCount = 0) => {
        if (selectedImages.length === 0) {
            Alert.alert('No Images', 'Please add at least one image to upload.');
            return;
        }

        if (!taskId) return;

        setUploading(true);

        try {
            // Create form data
            const formData = new FormData();

            for (let i = 0; i < selectedImages.length; i++) {
                const uri = selectedImages[i];
                const filename = uri.split('/').pop() || `image_${i}.jpg`;
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';

                formData.append('images', {
                    uri,
                    name: filename,
                    type,
                } as any);
            }

            console.log(`[WorkUpload] Uploading ${selectedImages.length} images (attempt ${retryCount + 1})`);
            const response = await tasksAPI.uploadWorkerImages(taskId, formData);
            console.log('[WorkUpload] Upload successful:', response);

            Alert.alert(
                'Success!',
                'Your images have been uploaded. The supervisor will review and verify your work.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/tasks'),
                    },
                ]
            );
        } catch (error: any) {
            console.error('Upload failed:', error);

            // Check if it's a timeout error
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

            if (isTimeout && retryCount < 2) {
                // Auto-retry on timeout (up to 2 retries)
                Alert.alert(
                    'Slow Connection',
                    'Upload is taking longer than expected. Retrying...',
                    [{ text: 'OK' }]
                );
                setUploading(false);
                setTimeout(() => uploadImages(retryCount + 1), 1000);
                return;
            }

            // Show appropriate error message
            const errorMessage = isTimeout
                ? 'Upload timed out. Please check your internet connection and try again with fewer or smaller images.'
                : error.response?.data?.message || 'Failed to upload images. Please try again.';

            Alert.alert('Upload Failed', errorMessage);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                <StatusBar style="dark" />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#464ace" />
                    <Text style={{ marginTop: 16, color: '#64748b' }}>Loading task...</Text>
                </View>
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
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#e2e8f0',
                flexDirection: 'row',
                alignItems: 'center',
            }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <ArrowLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>
                        Upload Work Images
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748b' }} numberOfLines={1}>
                        {task?.title}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 180 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Task Info Card */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 8 }}>
                        Task Summary
                    </Text>
                    <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>
                        {task?.description}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            backgroundColor: '#22c55e',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 4,
                        }}>
                            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>
                                ₹{task?.budget.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Before Images Reference */}
                {task?.beforeImages && task.beforeImages.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 12 }}>
                            Reference (Before Images)
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {task.beforeImages.map((img, index) => (
                                <View
                                    key={index}
                                    style={{
                                        width: 120,
                                        height: 120,
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        marginRight: 12,
                                        backgroundColor: '#f1f5f9',
                                    }}
                                >
                                    <Image
                                        source={{ uri: transformImageUrl(img) }}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="cover"
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Upload Section */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 12 }}>
                        Your Work Images ({selectedImages.length}/10)
                    </Text>

                    {/* Image Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {selectedImages.map((uri, index) => (
                            <View
                                key={index}
                                style={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    backgroundColor: '#f1f5f9',
                                }}
                            >
                                <Image
                                    source={{ uri }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                />
                                <TouchableOpacity
                                    onPress={() => removeImage(index)}
                                    style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                        borderRadius: 12,
                                        padding: 4,
                                    }}
                                >
                                    <X size={14} color="#ffffff" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Add Buttons */}
                        {selectedImages.length < 10 && (
                            <>
                                <TouchableOpacity
                                    onPress={takePhoto}
                                    style={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: 12,
                                        borderWidth: 2,
                                        borderColor: '#464ace',
                                        borderStyle: 'dashed',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#f8fafc',
                                    }}
                                >
                                    <Camera size={24} color="#464ace" />
                                    <Text style={{ fontSize: 11, color: '#464ace', marginTop: 4 }}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={pickImages}
                                    style={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: 12,
                                        borderWidth: 2,
                                        borderColor: '#22c55e',
                                        borderStyle: 'dashed',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#f8fafc',
                                    }}
                                >
                                    <ImagePlus size={24} color="#22c55e" />
                                    <Text style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>Gallery</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* Instructions */}
                <View style={{
                    backgroundColor: '#fef3c7',
                    borderRadius: 12,
                    padding: 16,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Clock size={18} color="#d97706" style={{ marginTop: 2 }} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400e', marginBottom: 4 }}>
                                What happens next?
                            </Text>
                            <Text style={{ fontSize: 13, color: '#92400e', lineHeight: 20 }}>
                                Your images will be sent to the supervisor for review. They will verify the work quality using AI-powered analysis. You'll be notified once the verification is complete.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Upload Button */}
            <View style={{
                position: 'absolute',
                bottom: 80,
                left: 0,
                right: 0,
                padding: 20,
                backgroundColor: '#ffffff',
                borderTopWidth: 1,
                borderTopColor: '#e2e8f0',
            }}>
                <TouchableOpacity
                    onPress={() => uploadImages()}
                    disabled={selectedImages.length === 0 || uploading}
                    style={{
                        backgroundColor: selectedImages.length === 0 ? '#cbd5e1' : uploading ? '#94a3b8' : '#464ace',
                        paddingVertical: 16,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    {uploading ? (
                        <>
                            <ActivityIndicator color="#ffffff" size="small" />
                            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                                UPLOADING...
                            </Text>
                        </>
                    ) : (
                        <>
                            <Upload size={20} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                                SUBMIT FOR REVIEW ({selectedImages.length})
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Bottom Nav */}
            <BottomNav
                activeTab="tasks"
                onTabPress={(tab) => {
                    if (tab === 'dashboard') router.push('/dashboard');
                    if (tab === 'calendar') router.push('/calendar');
                    if (tab === 'tasks') router.push('/tasks');
                }}
                userRole={user?.role}
            />
        </SafeAreaView>
    );
}
