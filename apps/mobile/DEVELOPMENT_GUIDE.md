# 📱 Mobile App Development Guide

## Executive Summary

This document outlines the development workflow for the **Worker Mobile App** built with React Native (Expo). The mobile app is the primary interface for **workers** to discover, accept, and complete tasks, while the web application serves as the **supervisor/client dashboard** for task management and verification.

---

## 🎯 Platform Roles

| Platform | Primary User | Core Purpose |
|----------|--------------|--------------|
| **Mobile App** | Workers | Task discovery, acceptance, GPS tracking, work submission |
| **Web App** | Clients/Supervisors | Task creation, worker management, verification review, payments |

---

## 🔄 Shared Backend Architecture

Both platforms share the **same NestJS backend** and API endpoints:

```
┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │    Web App      │
│  (React Native) │     │    (React)      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   Backend   │
              │  (NestJS)   │
              │ /v0/tasks/* │
              │ /v0/auth/*  │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
    │PostgreSQL│ │  MinIO  │ │AI Service│
    └─────────┘ └─────────┘ └──────────┘
```

### Shared Endpoints

| Endpoint | Method | Mobile | Web |
|----------|--------|--------|-----|
| `/v0/auth/login` | POST | ✅ | ✅ |
| `/v0/auth/register` | POST | ✅ | ✅ |
| `/v0/auth/me` | GET | ✅ | ✅ |
| `/v0/tasks` | GET | ✅ (worker view) | ✅ (client view) |
| `/v0/tasks/:id` | GET | ✅ | ✅ |
| `/v0/tasks/:id/accept` | POST | ✅ | ❌ |
| `/v0/tasks/:id/submit` | POST | ✅ | ❌ |
| `/v0/tasks/:id/location` | POST | ✅ | ❌ |
| `/v0/tasks` | POST | ❌ | ✅ |
| `/v0/tasks/:id/dispute` | POST | ❌ | ✅ |

---

## 📱 Mobile-Specific Features

### 1. **Geolocation & GPS Tracking**

Workers must be at the job site. Mobile provides:

```typescript
// Mobile-only capabilities
import * as Location from 'expo-location';

// Features needed:
- Real-time GPS tracking during active tasks
- Background location updates
- Geofencing (verify worker is at job site)
- Distance calculation from task location
```

**Implementation Priority: HIGH**

```
Worker Flow:
1. Accept task → GPS tracking starts
2. Navigate to location (show distance)
3. Arrive at site → System verifies location
4. Complete work → GPS tracking stops
```

### 2. **Camera & Photo Capture**

Workers capture evidence of completed work:

```typescript
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

// Features needed:
- Native camera integration
- Photo quality settings
- Multiple photo capture
- Before/After comparison view
- Video recording support
```

**Photo Workflow:**
```
1. View reference "before" images from client
2. Capture "after" photos/videos
3. Preview and confirm
4. Upload with progress indicator
5. AI verification runs automatically
```

### 3. **Push Notifications**

Real-time updates for workers:

```typescript
import * as Notifications from 'expo-notifications';

// Notification types:
- New task available nearby
- Task accepted/assigned to worker
- Payment released
- Dispute raised
- AI verification complete
```

### 4. **Offline Support** (Future)

Workers may have poor connectivity at job sites:

```typescript
// Offline capabilities:
- Cache accepted task details
- Queue photo uploads
- Sync when connection restored
- Show offline indicator
```

---

## 🔀 Workflow Differences: Mobile vs Web

### Task Discovery & Marketplace

| Aspect | Mobile (Worker) | Web (Client) |
|--------|-----------------|--------------|
| **View** | List of available tasks | Dashboard of created tasks |
| **Filter** | By distance, pay, category | By status, worker, date |
| **Primary Action** | "Accept Task" | "Create Task" |
| **Map** | Worker location + nearby tasks | Task locations overview |

### Task Lifecycle (Mobile Perspective)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WORKER MOBILE JOURNEY                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  BROWSE  │───▶│  ACCEPT  │───▶│ NAVIGATE │───▶│  ARRIVE  │          │
│  │  Tasks   │    │   Task   │    │  to Site │    │ (GPS ✓)  │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│                                                         │               │
│                                                         ▼               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ GET PAID │◀───│   WAIT   │◀───│  SUBMIT  │◀───│  WORK    │          │
│  │   💰     │    │ for AI   │    │  Photos  │    │  (Do it) │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Task Lifecycle (Web Perspective)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT WEB JOURNEY                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  CREATE  │───▶│   WAIT   │───▶│  TRACK   │───▶│  REVIEW  │          │
│  │   Task   │    │ for Bid  │    │  Worker  │    │   Work   │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│                                                         │               │
│                           Dispute?───┐                  │               │
│  ┌──────────┐    ┌──────────┐       │          ┌───────▼───────┐       │
│  │ RELEASE  │◀───│ AI PASS  │◀──────┴──────────│  AI VERIFY    │       │
│  │ Payment  │    │   ✓      │                  │  Auto/Manual  │       │
│  └──────────┘    └──────────┘                  └───────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📲 Mobile App Screens

### Authentication (Already Implemented ✅)
- Login Screen
- Register Screen
- Forgot Password

### Core Screens (To Build)

#### 1. **Home / Dashboard**
```
┌─────────────────────────────┐
│  👋 Welcome, John           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━   │
│                             │
│  💰 Earnings Today: $45     │
│  📋 Active Tasks: 2         │
│  ✅ Completed: 8            │
│                             │
│  ─────────────────────────  │
│  📍 Nearby Tasks            │
│  [Task Card 1]              │
│  [Task Card 2]              │
│  [Task Card 3]              │
│                             │
│  ─────────────────────────  │
│  🔥 Your Active Tasks       │
│  [Active Task Card]         │
│                             │
└─────────────────────────────┘
```

#### 2. **Task Marketplace**
```
┌─────────────────────────────┐
│  🔍 Search Tasks            │
│  [Filter: Distance ▼]       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━   │
│                             │
│  ┌─────────────────────┐    │
│  │ 🔧 Fix Broken Pipe  │    │
│  │ 📍 2.3 km away      │    │
│  │ 💰 $50              │    │
│  │ ⏰ Due: Today       │    │
│  │ [Accept Task]       │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ 🪑 Repair Chair     │    │
│  │ 📍 5.1 km away      │    │
│  │ 💰 $30              │    │
│  │ ⏰ Due: Tomorrow    │    │
│  │ [Accept Task]       │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
```

#### 3. **Active Task View**
```
┌─────────────────────────────┐
│  ← Task Details             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━   │
│                             │
│  🔧 Fix Broken Pipe         │
│  Status: IN_PROGRESS        │
│                             │
│  📍 123 Main St             │
│  [     Open Maps     ]      │
│                             │
│  📝 Description:            │
│  Water pipe leak in         │
│  bathroom needs repair...   │
│                             │
│  📸 Reference Photos:       │
│  [img] [img] [img]          │
│                             │
│  ─────────────────────────  │
│                             │
│  [  📷 Submit Work  ]       │
│                             │
└─────────────────────────────┘
```

#### 4. **Work Submission**
```
┌─────────────────────────────┐
│  ← Submit Work              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━   │
│                             │
│  📸 Before Images:          │
│  [img] [img]                │
│                             │
│  📷 Your Photos:            │
│  [img] [img] [+Add]         │
│                             │
│  🎥 Or Record Video:        │
│  [  Record Video  ]         │
│                             │
│  ─────────────────────────  │
│                             │
│  [  ✅ Submit for Review  ] │
│                             │
│  ⏳ AI will verify your     │
│  work automatically         │
│                             │
└─────────────────────────────┘
```

#### 5. **Earnings / Wallet**
```
┌─────────────────────────────┐
│  💰 My Earnings             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━   │
│                             │
│  Available Balance          │
│  ████████████████████████   │
│  $234.50                    │
│                             │
│  [   Withdraw   ]           │
│                             │
│  ─────────────────────────  │
│  Recent Transactions        │
│                             │
│  ✅ Fix Pipe      +$50      │
│  ✅ Repair Chair  +$30      │
│  🔄 Pending...    $25       │
│                             │
└─────────────────────────────┘
```

---

## 🔌 API Integration Patterns

### Mobile-Specific Considerations

#### 1. **Token Storage**
```typescript
// Web uses localStorage
localStorage.setItem('token', token);

// Mobile uses SecureStore
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('token', token);
```

#### 2. **Image Upload**
```typescript
// Web uses FormData + fetch
const formData = new FormData();
formData.append('file', file);

// Mobile uses FormData but with uri
const formData = new FormData();
formData.append('file', {
  uri: photo.uri,
  type: 'image/jpeg',
  name: 'photo.jpg',
} as any);
```

#### 3. **Real-time Location Updates**
```typescript
// Mobile-only: Send location during active task
const sendLocation = async (taskId: string) => {
  const location = await Location.getCurrentPositionAsync({});
  
  await api.post(`/tasks/${taskId}/location`, {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  });
};

// Background tracking
Location.startLocationUpdatesAsync('LOCATION_TASK', {
  accuracy: Location.Accuracy.High,
  timeInterval: 30000, // Every 30 seconds
  distanceInterval: 10, // Or every 10 meters
});
```

#### 4. **Push Notifications Setup**
```typescript
// Register for push notifications
const registerForPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  
  const token = await Notifications.getExpoPushTokenAsync();
  
  // Send token to backend
  await api.post('/users/push-token', { token: token.data });
};
```

---

## 📂 Recommended Project Structure

```
apps/mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Auth screens (login, register)
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/             # Main tabbed navigation
│   │   ├── index.tsx       # Home/Dashboard
│   │   ├── tasks.tsx       # Marketplace
│   │   ├── my-tasks.tsx    # Active tasks
│   │   └── profile.tsx     # Profile/Settings
│   ├── task/
│   │   ├── [id].tsx        # Task details
│   │   └── submit/[id].tsx # Work submission
│   └── _layout.tsx
│
├── components/
│   ├── TaskCard.tsx
│   ├── CameraCapture.tsx
│   ├── LocationTracker.tsx
│   └── ...
│
├── services/
│   ├── api.ts              # Axios instance
│   ├── auth.ts             # Auth helpers
│   └── location.ts         # GPS helpers
│
├── hooks/
│   ├── useAuth.ts
│   ├── useLocation.ts
│   ├── useTasks.ts
│   └── useCamera.ts
│
├── contexts/
│   ├── AuthContext.tsx
│   └── LocationContext.tsx
│
└── utils/
    ├── storage.ts          # SecureStore helpers
    └── permissions.ts      # Permission handlers
```

---

## 🚀 Development Phases

### Phase 1: Core Worker Flow (Week 1-2)
- [ ] Home/Dashboard screen
- [ ] Task Marketplace with filters
- [ ] Task detail view
- [ ] Accept task flow
- [ ] Basic navigation

### Phase 2: Work Submission (Week 2-3)
- [ ] Camera integration
- [ ] Photo capture & preview
- [ ] Video recording
- [ ] Upload with progress
- [ ] AI verification status display

### Phase 3: GPS & Tracking (Week 3-4)
- [ ] Location permissions
- [ ] Distance to task display
- [ ] Navigation to task (open maps)
- [ ] Background location tracking
- [ ] Geofence verification

### Phase 4: Notifications & Polish (Week 4-5)
- [ ] Push notification setup
- [ ] Notification handlers
- [ ] Earnings/Wallet screen
- [ ] Profile settings
- [ ] Offline support (basic)

---

## 🔐 Permissions Required

| Permission | Purpose | When to Request |
|------------|---------|-----------------|
| Camera | Capture work photos | Before photo capture |
| Photo Library | Select existing photos | Before gallery access |
| Location (foreground) | Show nearby tasks | On app start |
| Location (background) | Track during active task | On task accept |
| Notifications | Task updates | On login |

---

## 🎨 UI/UX Considerations

### Mobile vs Web Design

| Aspect | Mobile | Web |
|--------|--------|-----|
| Navigation | Bottom tabs + Stack | Sidebar + Pages |
| Task Cards | Vertical scroll | Grid layout |
| Photos | Full-screen camera | File upload |
| Maps | Native maps SDK | Google Maps embed |
| Gestures | Swipe, pull-to-refresh | Click, hover |

### Recommended Libraries

```json
{
  "dependencies": {
    "expo-camera": "Camera access",
    "expo-image-picker": "Photo selection",
    "expo-location": "GPS tracking",
    "expo-notifications": "Push notifications",
    "expo-secure-store": "Token storage",
    "react-native-maps": "Map display",
    "@react-navigation/native": "Navigation",
    "axios": "HTTP client",
    "zustand": "State management"
  }
}
```

---

## ✅ Checklist Before Development

- [ ] Backend endpoints verified working
- [ ] Auth flow tested with mobile simulator
- [ ] API_URL configured for local dev
- [ ] Expo development client installed
- [ ] Test device permissions working
- [ ] Push notification credentials (later)

---

## 📞 Need Backend Changes?

Most endpoints should work as-is, but mobile may need:

1. **Push notification endpoint**: `POST /users/push-token`
2. **Location endpoint** exists: `POST /tasks/:id/location`
3. **Mobile-friendly error messages**
4. **Smaller image/video limits for mobile uploads**

---

*Last Updated: January 2025*
