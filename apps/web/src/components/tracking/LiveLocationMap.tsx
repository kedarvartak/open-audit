// this file is not used for web anymore, however it is preserved so as to retain the logic 
// if required in future

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, DirectionsRenderer } from '@react-google-maps/api';
import { subscribeToWorkerLocation, type WorkerLocation } from '../../lib/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { AlertCircle } from 'lucide-react';

interface LiveLocationMapProps {
    taskId: string;
    destinationLat: number;
    destinationLng: number;
    destinationName?: string;
    geofenceRadius?: number; // Arrival zone radius in meters
    onArrival?: () => void;
    fullHeight?: boolean; // If true, map fills container height
}

export const LiveLocationMap = ({
    taskId,
    destinationLat,
    destinationLng,
    destinationName,
    geofenceRadius = 100,
    onArrival,
    fullHeight = false,
}: LiveLocationMapProps) => {
    const { theme } = useTheme();
    const [workerLocation, setWorkerLocation] = useState<WorkerLocation | null>(null);
    const [lastUpdate, setLastUpdate] = useState<string>('');
    const [hasArrived, setHasArrived] = useState(false);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    // Load Google Maps
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    });

    // Subscribe to worker location updates
    useEffect(() => {
        const unsubscribe = subscribeToWorkerLocation(taskId, (location) => {
            setWorkerLocation(location);
            if (location) {
                const now = Date.now();
                const diff = Math.floor((now - location.updatedAt) / 1000);
                if (diff < 60) {
                    setLastUpdate(`${diff}s ago`);
                } else {
                    setLastUpdate(`${Math.floor(diff / 60)}m ago`);
                }

                // Check if worker is close to destination (within 100m)
                const distance = calculateDistance(
                    location.lat,
                    location.lng,
                    destinationLat,
                    destinationLng
                );
                if (distance <= 100 && !hasArrived && onArrival) {
                    setHasArrived(true);
                    onArrival();
                }
            }
        });

        return () => unsubscribe();
    }, [taskId, destinationLat, destinationLng, onArrival, hasArrived]);

    // Calculate distance in meters (Haversine formula)
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Calculate ETA (rough estimate)
    const getETA = (): string => {
        if (!workerLocation) return '--';
        const distance = calculateDistance(
            workerLocation.lat,
            workerLocation.lng,
            destinationLat,
            destinationLng
        );
        // Assume average speed of 30 km/h if no speed data
        const speedMps = workerLocation.speed || 8.33; // 30 km/h in m/s
        const timeSeconds = distance / speedMps;
        if (timeSeconds < 60) return '< 1 min';
        if (timeSeconds < 3600) return `~${Math.ceil(timeSeconds / 60)} min`;
        return `~${Math.ceil(timeSeconds / 3600)} hr`;
    };

    // Get distance display
    const getDistanceDisplay = (): string => {
        if (!workerLocation) return '--';
        const distance = calculateDistance(
            workerLocation.lat,
            workerLocation.lng,
            destinationLat,
            destinationLng
        );
        if (distance < 1000) return `${Math.round(distance)}m`;
        return `${(distance / 1000).toFixed(1)}km`;
    };

    // Fit bounds when worker location updates
    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    // Calculate route when worker location updates
    useEffect(() => {
        if (workerLocation && window.google) {
            const directionsService = new google.maps.DirectionsService();
            directionsService.route(
                {
                    origin: { lat: workerLocation.lat, lng: workerLocation.lng },
                    destination: { lat: destinationLat, lng: destinationLng },
                    travelMode: google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK && result) {
                        setDirections(result);
                    }
                }
            );
        }
    }, [workerLocation, destinationLat, destinationLng]);

    useEffect(() => {
        if (mapRef.current && workerLocation) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: workerLocation.lat, lng: workerLocation.lng });
            bounds.extend({ lat: destinationLat, lng: destinationLng });
            mapRef.current.fitBounds(bounds, 50);
        }
    }, [workerLocation, destinationLat, destinationLng]);

    // Map container style
    const mapContainerStyle = {
        width: '100%',
        height: fullHeight ? '100%' : '256px',
    };

    // Dark mode map style
    const darkMapStyle: google.maps.MapTypeStyle[] = [
        { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#334155' }] },
        { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#334155' }] },
    ];

    if (loadError) {
        return (
            <div className={`rounded-lg overflow-hidden border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle size={20} />
                    <span>Failed to load Google Maps</span>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className={`rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="w-full h-64 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                    <div className="animate-pulse text-slate-500">Loading map...</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${fullHeight ? 'h-full flex flex-col' : ''} rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            {/* Map Container */}
            <div className={fullHeight ? 'flex-1' : ''}>
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={{ lat: destinationLat, lng: destinationLng }}
                    zoom={14}
                    options={{
                        styles: theme === 'dark' ? darkMapStyle : [],
                        disableDefaultUI: true,
                        zoomControl: true,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                    }}
                    onLoad={onMapLoad}
                >
                    {/* Destination/Client marker (blue circle) */}
                    <Marker
                        position={{ lat: destinationLat, lng: destinationLng }}
                        title={destinationName || 'Task Location'}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: '#464ace',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 3,
                        }}
                    />

                    {/* Geofence/Arrival zone circle */}
                    <Circle
                        center={{ lat: destinationLat, lng: destinationLng }}
                        radius={geofenceRadius}
                        options={{
                            fillColor: '#10B981',
                            fillOpacity: 0.08,
                            strokeColor: '#10B981',
                            strokeWeight: 2,
                            strokeOpacity: 0.4,
                        }}
                    />

                    {/* Inner destination ring */}
                    <Circle
                        center={{ lat: destinationLat, lng: destinationLng }}
                        radius={20}
                        options={{
                            fillColor: '#10B981',
                            fillOpacity: 0.3,
                            strokeColor: '#10B981',
                            strokeWeight: 3,
                            strokeOpacity: 0.8,
                        }}
                    />

                    {/* Worker marker (car/worker icon) */}
                    {workerLocation && (
                        <>
                            <Marker
                                position={{ lat: workerLocation.lat, lng: workerLocation.lng }}
                                title={workerLocation.workerName}
                                icon={{
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 10,
                                    fillColor: '#F59E0B',
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 3,
                                }}
                            />

                            {/* Worker position ring */}
                            <Circle
                                center={{ lat: workerLocation.lat, lng: workerLocation.lng }}
                                radius={30}
                                options={{
                                    fillColor: '#F59E0B',
                                    fillOpacity: 0.2,
                                    strokeColor: '#F59E0B',
                                    strokeWeight: 2,
                                    strokeOpacity: 0.6,
                                }}
                            />

                        </>
                    )}

                    {/* Directions Route */}
                    {directions && (
                        <DirectionsRenderer
                            directions={directions}
                            options={{
                                suppressMarkers: true,
                                polylineOptions: {
                                    strokeColor: '#F59E0B',
                                    strokeWeight: 5,
                                    strokeOpacity: 0.8,
                                },
                            }}
                        />
                    )}
                </GoogleMap>
            </div>

            {/* Info Bar */}
            <div className={`p-3 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                {workerLocation ? (
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Worker Name Chip */}
                        <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-orange-500 text-white">
                            {workerLocation.workerName}
                        </span>

                        {/* Last Update Chip */}
                        <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-amber-400 text-slate-900">
                            {lastUpdate}
                        </span>

                        {/* Distance Chip */}
                        <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-emerald-500 text-white">
                            {getDistanceDisplay()}
                        </span>

                        {/* ETA Chip */}
                        <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-[#464ace] text-white">
                            ETA: {getETA()}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-2">
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Waiting for worker location...
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
