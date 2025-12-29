import { useState, useEffect, useCallback, useRef } from 'react';
import { updateWorkerLocation, clearWorkerLocation, type WorkerLocation } from '../lib/firebase';

interface UseLocationTrackingOptions {
    taskId: string;
    workerId: string;
    workerName: string;
    isTracking: boolean; // Should be true while status is EN_ROUTE
    updateIntervalMs?: number; // How often to push updates (default: 5000ms)
}

interface LocationTrackingState {
    isTracking: boolean;
    currentLocation: GeolocationPosition | null;
    error: string | null;
    lastUpdateTime: number | null;
}

export const useLocationTracking = ({
    taskId,
    workerId,
    workerName,
    isTracking,
    updateIntervalMs = 5000,
}: UseLocationTrackingOptions): LocationTrackingState => {
    const [state, setState] = useState<LocationTrackingState>({
        isTracking: false,
        currentLocation: null,
        error: null,
        lastUpdateTime: null,
    });

    const watchIdRef = useRef<number | null>(null);
    const lastPositionRef = useRef<GeolocationPosition | null>(null);
    const lastPushRef = useRef<number>(0);

    // Push location to Firebase
    const pushLocation = useCallback(async (position: GeolocationPosition) => {
        const now = Date.now();

        // Throttle updates to specified interval
        if (now - lastPushRef.current < updateIntervalMs) {
            return;
        }

        // Build location data, only including defined values
        const locationData: Omit<WorkerLocation, 'updatedAt'> = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            workerId,
            workerName,
        };

        // Only include heading if it's a valid number
        if (typeof position.coords.heading === 'number' && !isNaN(position.coords.heading)) {
            locationData.heading = position.coords.heading;
        }

        // Only include speed if it's a valid number
        if (typeof position.coords.speed === 'number' && !isNaN(position.coords.speed)) {
            locationData.speed = position.coords.speed;
        }

        const success = await updateWorkerLocation(taskId, locationData);

        if (success) {
            lastPushRef.current = now;
            setState(prev => ({
                ...prev,
                lastUpdateTime: now,
            }));
        }
    }, [taskId, workerId, workerName, updateIntervalMs]);

    // Handle position update
    const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
        lastPositionRef.current = position;
        setState(prev => ({
            ...prev,
            currentLocation: position,
            error: null,
        }));

        pushLocation(position);
    }, [pushLocation]);

    // Handle error
    const handleError = useCallback((error: GeolocationPositionError) => {
        let errorMessage = 'Unknown location error';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location unavailable';
                break;
            case error.TIMEOUT:
                errorMessage = 'Location request timed out';
                break;
        }
        setState(prev => ({
            ...prev,
            error: errorMessage,
        }));
    }, []);

    // Start/stop tracking based on isTracking prop
    useEffect(() => {
        if (isTracking && !watchIdRef.current) {
            // Start watching position
            if ('geolocation' in navigator) {
                watchIdRef.current = navigator.geolocation.watchPosition(
                    handlePositionUpdate,
                    handleError,
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                    }
                );
                setState(prev => ({ ...prev, isTracking: true }));
            } else {
                setState(prev => ({
                    ...prev,
                    error: 'Geolocation not supported',
                }));
            }
        } else if (!isTracking && watchIdRef.current !== null) {
            // Stop watching and clear location
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            clearWorkerLocation(taskId);
            setState(prev => ({
                ...prev,
                isTracking: false,
                currentLocation: null,
            }));
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isTracking, taskId, handlePositionUpdate, handleError]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                clearWorkerLocation(taskId);
            }
        };
    }, [taskId]);

    return state;
};
