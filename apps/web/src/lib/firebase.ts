import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { getDatabase, ref, set, onValue, off, type Database } from 'firebase/database';

// Check if all required config is present
const isFirebaseConfigured =
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let database: Database | null = null;

if (isFirebaseConfigured) {
    try {
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
            databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        };

        app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);

        // Initialize Realtime Database if URL is configured
        const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;
        if (dbUrl) {
            try {
                // Sanitize URL - remove trailing slashes and any paths
                let cleanUrl = dbUrl.trim();
                // Remove trailing slash if present
                if (cleanUrl.endsWith('/')) {
                    cleanUrl = cleanUrl.slice(0, -1);
                }
                // Validate URL format - should end with .firebaseio.com
                if (cleanUrl.includes('.firebaseio.com')) {
                    // Extract just the root URL (in case someone added a path)
                    const urlParts = cleanUrl.split('.firebaseio.com');
                    cleanUrl = urlParts[0] + '.firebaseio.com';

                    database = getDatabase(app, cleanUrl);
                    console.log('Firebase Realtime Database initialized:', cleanUrl);
                } else {
                    console.warn('Invalid Firebase Database URL format. Expected format: https://project-id.firebaseio.com');
                }
            } catch (dbError) {
                console.error('Failed to initialize Realtime Database:', dbError);
            }
        }

        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
} else {
    console.warn('Firebase credentials missing - Notifications disabled');
}

export const requestForToken = async () => {
    if (!messaging) return null;

    try {
        // Explicitly register service worker first
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (currentToken) {
            return currentToken;
        } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }
    } catch (err) {
        console.log('An error occurred while retrieving token. ', err);
        return null;
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) return;

        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });

// ==================== LOCATION TRACKING ====================

export interface WorkerLocation {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    updatedAt: number;
    workerId: string;
    workerName: string;
}

// Worker: Update location in realtime database
export const updateWorkerLocation = async (
    taskId: string,
    location: Omit<WorkerLocation, 'updatedAt'>
): Promise<boolean> => {
    if (!database) {
        console.warn('Firebase Realtime Database not initialized');
        return false;
    }

    try {
        const locationRef = ref(database, `tracking/${taskId}`);

        // Firebase doesn't accept undefined values - only include defined properties
        const locationData: Record<string, unknown> = {
            lat: location.lat,
            lng: location.lng,
            workerId: location.workerId,
            workerName: location.workerName,
            updatedAt: Date.now(),
        };

        // Only add optional fields if they have values
        if (location.heading !== undefined && location.heading !== null) {
            locationData.heading = location.heading;
        }
        if (location.speed !== undefined && location.speed !== null) {
            locationData.speed = location.speed;
        }

        await set(locationRef, locationData);
        return true;
    } catch (error) {
        console.error('Failed to update worker location:', error);
        return false;
    }
};

// Client: Subscribe to worker location updates
export const subscribeToWorkerLocation = (
    taskId: string,
    callback: (location: WorkerLocation | null) => void
): (() => void) => {
    if (!database) {
        console.warn('Firebase Realtime Database not initialized');
        return () => { };
    }

    const locationRef = ref(database, `tracking/${taskId}`);

    onValue(locationRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            callback(data as WorkerLocation);
        } else {
            callback(null);
        }
    });

    // Return unsubscribe function
    return () => {
        off(locationRef);
    };
};

// Worker: Clear location when work is done
export const clearWorkerLocation = async (taskId: string): Promise<boolean> => {
    if (!database) {
        console.warn('Firebase Realtime Database not initialized');
        return false;
    }

    try {
        const locationRef = ref(database, `tracking/${taskId}`);
        await set(locationRef, null);
        return true;
    } catch (error) {
        console.error('Failed to clear worker location:', error);
        return false;
    }
};

export { messaging, database };
