# Open Audit Mobile Application

A cross-platform mobile application built with Expo and React Native for the Open Audit task management platform. This app enables workers to accept, manage, and complete civic repair tasks while allowing clients to monitor progress in real-time.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Features](#features)
  - [Authentication](#authentication)
  - [Dashboard](#dashboard)
  - [Task Management](#task-management)
  - [Calendar View](#calendar-view)
  - [Work Upload](#work-upload)
  - [Location Services](#location-services)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Configuration](#configuration)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Navigation](#navigation)
- [UI Components](#ui-components)
- [Platform Support](#platform-support)

---

## Overview

The Open Audit mobile app is designed for field workers and clients participating in civic infrastructure repair and maintenance tasks. Workers can browse available tasks in the marketplace, accept assignments, navigate to task locations, document their work with photos, and submit completed work for verification. Clients can create tasks, monitor worker progress, and manage task completion.

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Expo SDK 54 |
| Language | TypeScript |
| UI Framework | React Native 0.81.5 |
| Navigation | Expo Router (file-based routing) |
| Styling | NativeWind (TailwindCSS for React Native) |
| State Management | React Context API |
| HTTP Client | Axios |
| Icons | Lucide React Native |
| Image Handling | Expo Image, Expo Image Picker |
| Location Services | Expo Location |
| Storage | AsyncStorage |
| Animations | React Native Reanimated |

---

## Features

### Authentication

The app implements a secure, multi-step authentication flow:

- **Email and Password Login**: Step-by-step login process with animated transitions
- **User Registration**: Support for both CLIENT and WORKER role registration
- **Persistent Sessions**: JWT tokens stored securely in AsyncStorage
- **Automatic Session Restoration**: Previously authenticated users are automatically logged in
- **Protected Routes**: Unauthenticated users are redirected to the login screen

Authentication State:
- User session management via AuthContext
- Automatic token refresh and validation
- Secure logout with cache clearing

### Dashboard

The main dashboard provides a comprehensive overview of the user's tasks:

- **Task Statistics**: Visual display of total tasks, active tasks, and completed tasks
- **Task Cards**: Rich task previews showing:
  - Task title and description
  - Status badges with color coding
  - Budget information
  - Location details
  - Deadline and scheduled time
  - Before images carousel
  - Client/Worker assignment information
- **Pull-to-Refresh**: Manual refresh capability for real-time updates
- **Task Filtering**: View tasks based on status (active, completed, all)
- **Quick Actions**: Direct access to task details, calendar, and work upload

### Task Management

Comprehensive task lifecycle management:

**For Workers:**
- Browse available tasks in the marketplace
- Accept tasks with location-based verification
- Track task status through multiple stages:
  - OPEN: Task available for acceptance
  - ACCEPTED: Worker has accepted the task
  - EN_ROUTE: Worker is traveling to the location
  - ARRIVED: Worker has reached the task location
  - IN_PROGRESS: Work is actively being performed
  - SUBMITTED: Work has been submitted for review
  - COMPLETED: Task has been verified and completed
  - VERIFIED: Work quality has been confirmed
  - PAID: Payment has been processed
- View detailed task information including images, location, and requirements

**For Clients:**
- View all created tasks and their current status
- Monitor worker progress in real-time
- Review submitted work and before/after images
- Track task completion and verification status

**Task Details Modal:**
- Full-screen modal with comprehensive task information
- Image carousel with navigation controls
- Status timeline showing task progression
- Quick actions based on task state and user role
- Location integration with maps app linking

### Calendar View

A dedicated calendar interface for task scheduling:

- **Monthly Calendar Grid**: Visual representation of scheduled tasks
- **Date Selection**: Tap to view tasks scheduled for specific dates
- **Task Indicators**: Dots on calendar days indicating scheduled tasks
- **Event Cards**: Detailed task previews when viewing a specific date
- **Upcoming Events**: Quick view of tasks in the next 7 days
- **Navigation Controls**: Move between months with previous/next buttons
- **Today Highlighting**: Current date is visually distinguished
- **Task Detail Access**: Direct navigation to full task details from calendar

### Work Upload

Dedicated screen for documenting and submitting completed work:

- **Multi-Image Upload**: Select multiple images from device gallery
- **Camera Integration**: Capture photos directly within the app
- **Image Preview**: View selected images before submission
- **Remove Images**: Delete unwanted images from the submission
- **Upload Progress**: Visual feedback during image upload
- **Retry Mechanism**: Automatic retry for failed uploads with configurable attempts
- **Success Confirmation**: Clear feedback upon successful submission
- **Task Context**: View original task details while uploading

### Location Services

Integrated location features for field work verification:

- **Permission Management**: Request and handle location permissions with user-friendly prompts
- **Current Location**: Get precise GPS coordinates with high accuracy
- **Distance Calculation**: Haversine formula implementation for accurate distance measurement
- **Radius Verification**: Check if worker is within acceptable distance of task location
- **Map Integration**: Open task locations in the device's default maps application
- **Error Handling**: Graceful handling of location service failures

---

## Project Structure

```
apps/mobile/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout with navigation structure
│   ├── index.tsx                 # Entry point (redirects to login)
│   ├── login.tsx                 # Multi-step login screen
│   ├── register.tsx              # User registration screen
│   ├── dashboard.tsx             # Main dashboard with task overview
│   ├── tasks.tsx                 # Task list and marketplace view
│   ├── calendar.tsx              # Calendar view for scheduled tasks
│   ├── work-upload.tsx           # Work documentation and submission
│   └── global.css                # Global TailwindCSS styles
├── components/                   # Reusable UI components
│   ├── ui/                       # Core UI components
│   │   ├── BottomNav.tsx         # Bottom navigation bar
│   │   ├── Button.tsx            # Styled button component
│   │   ├── Input.tsx             # Form input component
│   │   ├── Logo.tsx              # App logo component
│   │   ├── Skeleton.tsx          # Loading skeleton components
│   │   ├── TaskDetailsModal.tsx  # Full-screen task details modal
│   │   ├── collapsible.tsx       # Collapsible content component
│   │   └── icon-symbol.tsx       # Icon components
│   ├── AuthLayout.tsx            # Authentication layout wrapper
│   ├── themed-text.tsx           # Theme-aware text component
│   ├── themed-view.tsx           # Theme-aware view component
│   └── parallax-scroll-view.tsx  # Parallax scrolling component
├── contexts/                     # React Context providers
│   ├── AuthContext.tsx           # Authentication state management
│   └── TasksContext.tsx          # Tasks state and caching
├── hooks/                        # Custom React hooks
│   ├── useLocation.ts            # Location services hook
│   ├── use-color-scheme.ts       # Color scheme detection
│   └── use-theme-color.ts        # Theme color utilities
├── services/                     # API and external services
│   └── api.ts                    # Backend API client and type definitions
├── constants/                    # App constants and configuration
├── assets/                       # Static assets (images, fonts)
├── scripts/                      # Build and utility scripts
├── app.json                      # Expo configuration
├── package.json                  # Dependencies and scripts
├── tailwind.config.js            # TailwindCSS/NativeWind configuration
├── tsconfig.json                 # TypeScript configuration
└── metro.config.js               # Metro bundler configuration
```

---

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Expo CLI (installed automatically via npx)
- iOS Simulator (macOS only) or Android Emulator
- Expo Go app (for physical device testing)

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd apps/mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

This will display a QR code and options to:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan the QR code with Expo Go app on a physical device

#### Platform-Specific Commands

```bash
# Android only
npm run android

# iOS only
npm run ios

# Web (experimental)
npm run web
```

---

## Configuration

### Backend API

The app connects to the deployed backend API. The base URL is configured in `services/api.ts`:

```typescript
const API_URL = 'https://backend-production-172c.up.railway.app/v0';
```

To connect to a local backend during development, modify this value to your local server address.

### Expo Configuration

App metadata and platform-specific settings are defined in `app.json`:

- App name and slug
- Version information
- Icon and splash screen assets
- iOS and Android specific configurations
- Expo plugins and experimental features

---

## API Integration

The app communicates with the backend through a centralized API client (`services/api.ts`):

### Available API Methods

**Authentication:**
- `authAPI.login(email, password)` - Authenticate user
- `authAPI.register(data)` - Create new account
- `authAPI.getMe()` - Get current user profile
- `authAPI.logout()` - End user session

**Tasks:**
- `tasksAPI.getMarketplace()` - Fetch available tasks
- `tasksAPI.getMyTasks(role)` - Fetch user's tasks based on role
- `tasksAPI.getTask(id)` - Fetch single task details
- `tasksAPI.acceptTask(id)` - Accept a task assignment
- `tasksAPI.startWork(id, lat, lng)` - Begin work on a task
- `tasksAPI.submitWork(id, formData)` - Submit completed work
- `tasksAPI.uploadWorkerImages(id, formData)` - Upload work documentation
- `tasksAPI.updateLocation(id, lat, lng)` - Update worker location

### Request/Response Handling

- Automatic JWT token injection via Axios interceptors
- Request/response logging for debugging
- Automatic 401 handling with session cleanup
- Configurable request timeout (10 seconds default)
- Image URL transformation for cross-platform compatibility

### Caching Strategy

The API client implements smart caching:
- Task cache with 30-second TTL for individual tasks
- Request deduplication to prevent simultaneous duplicate calls
- Cache invalidation on data mutations

---

## State Management

The app uses React Context for global state management:

### AuthContext

Manages user authentication state:
- Current user object
- Loading state during authentication checks
- Login, register, and logout methods
- User session refresh capability

### TasksContext

Manages task data with intelligent caching:
- Task list with automatic fetching
- 5-minute cache duration
- Force refresh capability
- Task filtering (active, completed)
- Date-based task queries for calendar
- Optimistic updates for better UX
- Deduplication of concurrent requests

---

## Navigation

The app uses Expo Router for file-based navigation:

### Route Structure

| Route | Screen | Description |
|-------|--------|-------------|
| `/` | Index | Entry point, redirects to login |
| `/login` | Login | User authentication |
| `/register` | Register | New user registration |
| `/dashboard` | Dashboard | Main task overview |
| `/tasks` | Tasks | Task list and marketplace |
| `/calendar` | Calendar | Calendar view of scheduled tasks |
| `/work-upload` | Work Upload | Submit work documentation |

### Navigation Patterns

- **Stack Navigation**: Primary navigation between screens
- **Modal Presentation**: Task details shown in full-screen modal
- **Tab-like Navigation**: Bottom navigation bar for main sections
- **Protected Routes**: Authentication-required screens redirect to login

---

## UI Components

### Core Components

**Button**: Customizable button with loading state support
- Primary and secondary variants
- Disabled state styling
- Loading spinner integration

**Input**: Form input with label and validation
- Password visibility toggle
- Keyboard type configuration
- Auto-complete support

**TaskDetailsModal**: Comprehensive task view modal
- Image carousel with navigation
- Status badges with color coding
- Action buttons based on task state
- Skeleton loading states

**BottomNav**: Persistent bottom navigation
- Icon-based navigation items
- Active state indication
- Role-based visibility

**Skeleton**: Loading placeholder components
- Customizable dimensions
- Animated shimmer effect
- Pre-built skeleton layouts for common patterns

### Styling

The app uses NativeWind (TailwindCSS for React Native) for styling:
- Utility-first CSS classes
- Responsive design support
- Consistent spacing and typography
- Theme-aware components

---

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| iOS | Supported | Requires iOS 13+ |
| Android | Supported | Requires Android 6+ |
| Web | Experimental | Limited functionality |

### Platform-Specific Features

**iOS:**
- Native haptic feedback
- iOS-specific navigation gestures
- Tablet support enabled

**Android:**
- Adaptive icons with foreground/background layers
- Edge-to-edge display support
- Material Design integration

---

## Development

### Code Quality

```bash
# Run ESLint
npm run lint
```

### Reset Project

To create a fresh project structure:

```bash
npm run reset-project
```

This moves existing code to `app-example/` and creates a blank `app/` directory.

### Type Safety

The project uses TypeScript with strict type checking. Key type definitions are in `services/api.ts`:
- `User` - User profile type
- `Task` - Complete task type with all fields
- API response types for all endpoints

---

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
