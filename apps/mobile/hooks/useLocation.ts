import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

interface LocationState {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    loading: boolean;
    error: string | null;
    permissionStatus: 'granted' | 'denied' | 'undetermined';
}

interface UseLocationReturn extends LocationState {
    requestPermission: () => Promise<boolean>;
    getCurrentLocation: () => Promise<{ latitude: number; longitude: number } | null>;
    calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
    isWithinRadius: (targetLat: number, targetLng: number, radiusMeters: number) => Promise<boolean>;
}

// Haversine formula to calculate distance between two coordinates in meters
const calculateHaversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

export const useLocation = (): UseLocationReturn => {
    const [state, setState] = useState<LocationState>({
        latitude: null,
        longitude: null,
        accuracy: null,
        loading: false,
        error: null,
        permissionStatus: 'undetermined',
    });

    // Check permission status on mount
    useEffect(() => {
        checkPermissionStatus();
    }, []);

    const checkPermissionStatus = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            setState(prev => ({
                ...prev,
                permissionStatus: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
            }));
        } catch (error) {
            console.error('[Location] Permission check failed:', error);
        }
    };

    const requestPermission = useCallback(async (): Promise<boolean> => {
        try {
            const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

            if (existingStatus === 'granted') {
                setState(prev => ({ ...prev, permissionStatus: 'granted' }));
                return true;
            }

            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status === 'granted') {
                setState(prev => ({ ...prev, permissionStatus: 'granted' }));
                return true;
            } else {
                setState(prev => ({ ...prev, permissionStatus: 'denied' }));
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location access in Settings to verify your presence at the task location.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
                );
                return false;
            }
        } catch (error) {
            console.error('[Location] Permission request failed:', error);
            setState(prev => ({ ...prev, error: 'Failed to request location permission' }));
            return false;
        }
    }, []);

    const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Check permission first
            const hasPermission = await requestPermission();
            if (!hasPermission) {
                setState(prev => ({ ...prev, loading: false }));
                return null;
            }

            // Get current location with high accuracy
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 0,
            });

            const { latitude, longitude, accuracy } = location.coords;

            setState(prev => ({
                ...prev,
                latitude,
                longitude,
                accuracy,
                loading: false,
                error: null,
            }));

            console.log(`[Location] Current position: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
            return { latitude, longitude };
        } catch (error: any) {
            console.error('[Location] Get position failed:', error);
            const errorMessage = error.code === 'E_LOCATION_SERVICES_DISABLED'
                ? 'Location services are disabled. Please enable them in Settings.'
                : 'Failed to get your location. Please try again.';

            setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
            }));

            Alert.alert('Location Error', errorMessage);
            return null;
        }
    }, [requestPermission]);

    const calculateDistance = useCallback((
        lat1: number,
        lng1: number,
        lat2: number,
        lng2: number
    ): number => {
        return calculateHaversineDistance(lat1, lng1, lat2, lng2);
    }, []);

    const isWithinRadius = useCallback(async (
        targetLat: number,
        targetLng: number,
        radiusMeters: number
    ): Promise<boolean> => {
        const currentLocation = await getCurrentLocation();
        if (!currentLocation) {
            return false;
        }

        const distance = calculateHaversineDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            targetLat,
            targetLng
        );

        console.log(`[Location] Distance to target: ${distance.toFixed(2)}m (radius: ${radiusMeters}m)`);
        return distance <= radiusMeters;
    }, [getCurrentLocation]);

    return {
        ...state,
        requestPermission,
        getCurrentLocation,
        calculateDistance,
        isWithinRadius,
    };
};
