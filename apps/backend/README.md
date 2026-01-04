# Backend API

A robust NestJS-based backend service powering the FixIt task management and verification platform. This API serves both the web application and mobile clients through a unified RESTful interface.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Module Structure](#module-structure)
4. [Services Documentation](#services-documentation)
5. [API Endpoints](#api-endpoints)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Database Schema](#database-schema)
8. [Authentication and Security](#authentication-and-security)
9. [Integration Points](#integration-points)
10. [Environment Configuration](#environment-configuration)
11. [Optimizations](#optimizations)
12. [Deployment](#deployment)

---

## Architecture Overview

The backend follows a modular monolithic architecture built on NestJS, designed for scalability and maintainability. It serves as the central hub connecting multiple services and clients.

```mermaid
graph TB
    subgraph Clients
        WEB[Web Application<br/>React + Vite]
        MOBILE[Mobile Application<br/>React Native]
    end

    subgraph Backend["NestJS Backend (Port 3001)"]
        API[API Gateway<br/>v0 Prefix]
        AUTH[Auth Module]
        TASKS[Tasks Module]
        WS[Workspaces Module]
        EXPORT[Export Module]
        BC[Blockchain Module]
        FB[Firebase Module]
        STORAGE[Storage Module]
        PRISMA[Prisma ORM]
    end

    subgraph External Services
        PG[(Supabase<br/>PostgreSQL)]
        CLOUD[(Cloudinary<br/>Image Storage)]
        AI[AI Service<br/>Python/FastAPI]
        CHAIN[Blockchain<br/>Polygon Testnet]
        FCM[Firebase Cloud<br/>Messaging]
        SHEETS[Google Sheets<br/>API]
    end

    WEB -->|HTTP/REST| API
    MOBILE -->|HTTP/REST| API
    
    API --> AUTH
    API --> TASKS
    API --> WS
    API --> EXPORT
    
    TASKS --> STORAGE
    TASKS --> AI
    TASKS --> BC
    TASKS --> FB
    
    AUTH --> PRISMA
    TASKS --> PRISMA
    WS --> PRISMA
    
    PRISMA --> PG
    STORAGE --> CLOUD
    BC --> CHAIN
    FB --> FCM
    EXPORT --> SHEETS
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Node.js 18+ | JavaScript runtime environment |
| **Framework** | NestJS 10.x | Enterprise-grade Node.js framework |
| **Database** | Supabase (PostgreSQL) | Cloud-hosted relational database (free tier) |
| **ORM** | Prisma 5.x | Type-safe database client and migrations |
| **Image Storage** | Cloudinary | Cloud image storage with CDN (free tier) |
| **Authentication** | JWT + Passport | Stateless token-based authentication |
| **Blockchain** | Ethers.js + Polygon | Ethereum-compatible audit trail (testnet) |
| **AI Integration** | Groq LLM + Custom Vision | Description enhancement and repair verification |
| **Push Notifications** | Firebase Cloud Messaging | Real-time mobile and web notifications |
| **Export** | Google Sheets API | Data export functionality |
| **Validation** | class-validator | Request payload validation |

---

## Module Structure

```
src/
├── main.ts                    # Application bootstrap
├── app.module.ts              # Root module - imports all feature modules
├── app.controller.ts          # Health check endpoint
├── app.service.ts             # Application-level service
│
├── auth/                      # Authentication Module
│   ├── auth.module.ts         # Module definition
│   ├── auth.controller.ts     # Login/Register endpoints
│   ├── auth.service.ts        # Authentication logic
│   ├── jwt.strategy.ts        # JWT validation strategy
│   ├── jwt-auth.guard.ts      # Route protection guard
│   ├── roles.guard.ts         # Role-based access control
│   └── roles.decorator.ts     # @Roles() decorator
│
├── tasks/                     # Tasks Module (Core Business Logic)
│   ├── tasks.module.ts        # Module definition
│   ├── tasks.controller.ts    # Task CRUD and workflow endpoints
│   ├── tasks.service.ts       # Task business logic
│   ├── ai-verification.service.ts  # AI repair verification
│   └── dto/                   # Data Transfer Objects
│
├── workspaces/                # Workspaces Module (Multi-tenancy)
│   ├── workspaces.module.ts   # Module definition
│   ├── workspaces.controller.ts  # Workspace CRUD endpoints
│   └── workspaces.service.ts  # Workspace and member management
│
├── blockchain/                # Blockchain Module (Audit Trail)
│   ├── blockchain.module.ts   # Module definition
│   └── blockchain.service.ts  # Smart contract interactions
│
├── firebase/                  # Firebase Module (Push Notifications)
│   ├── firebase.module.ts     # Module definition
│   └── firebase.service.ts    # FCM notification service
│
├── storage/                   # Storage Module (File Management)
│   ├── storage.module.ts      # Module definition
│   └── storage.service.ts     # Cloudinary file operations
│
├── export/                    # Export Module (Data Export)
│   ├── export.module.ts       # Module definition
│   ├── export.controller.ts   # Export endpoints
│   └── export.service.ts      # Google Sheets export
│
├── prisma/                    # Prisma Module (Database)
│   ├── prisma.module.ts       # Module definition
│   └── prisma.service.ts      # Prisma client wrapper
│
└── contracts/                 # Smart Contract ABIs
    └── abi/
        └── TaskEscrow.json    # TaskEscrow contract ABI
```

---

## Services Documentation

### AuthService

Handles user authentication, registration, and session management.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `validateUser(email, password)` | Validates credentials using bcrypt comparison |
| `login(user)` | Generates JWT token with user payload |
| `register(data)` | Creates user with hashed password and default workspace |
| `updateFcmToken(userId, token)` | Updates Firebase Cloud Messaging token for push notifications |
| `checkUserExists(email)` | Checks if email is already registered |

**Registration Flow:**
1. Hash password with bcrypt (10 salt rounds)
2. Create user record in database
3. Create default personal workspace
4. Set workspace as active for user
5. Return JWT token and user info

---

### TasksService

Core business logic for task lifecycle management.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `enhanceDescription(description)` | Uses Groq LLM to improve task descriptions |
| `createTask(clientId, dto, images)` | Creates task with image uploads and blockchain recording |
| `getOpenTasks(filters)` | Retrieves marketplace tasks with filtering |
| `acceptTask(taskId, workerId)` | Worker claims a task |
| `startJourney(taskId, workerId, location)` | Worker marks en-route status |
| `markArrived(taskId, workerId, location)` | Geofence-verified arrival |
| `startWork(taskId, workerId, location)` | Begin work on task |
| `submitWork(taskId, workerId, afterImages)` | Submit completed work with AI verification |
| `disputeTask(taskId, clientId, reason)` | Client disputes verification result |
| `updateTask(taskId, clientId, dto, images)` | Update task (only if OPEN) |
| `deleteTask(taskId, clientId)` | Delete task (only if OPEN) |

---

### AiVerificationService

Integrates with the external AI service for repair verification.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `analyzeDefect(beforeUrls, afterUrls)` | Sends images to AI service for comparison |
| `verifyRepair(taskId, beforeUrls, afterUrls)` | Processes AI response and returns verification result |

**Verification Response Structure:**
```typescript
{
  verified: boolean,      // Whether repair is verified
  confidence: number,     // 0-1 confidence score
  verdict: string,        // 'FIXED', 'PARTIAL', 'NOT_FIXED', 'NO_DEFECT'
  summary: string,        // Human-readable summary
  fixed_count: number,    // Number of defects fixed
  total_defects: number,  // Total defects detected
  details: DefectDetail[] // Per-defect analysis
}
```

---

### BlockchainService

Records immutable audit trail on Ethereum-compatible blockchain.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `recordTaskCreation(taskId, clientAddress, amount, stripeId)` | Records task creation on-chain |
| `recordTaskAcceptance(taskId, workerAddress)` | Records worker acceptance |
| `recordWorkSubmission(taskId, beforeHash, afterHash)` | Records image hashes for integrity |
| `recordAIVerification(taskId, confidence, approved)` | Records AI verdict on-chain |
| `recordPaymentRelease(taskId, stripeTransferId)` | Records payment completion |
| `recordDispute(taskId, reason)` | Records dispute filing |
| `getTaskAudit(taskId)` | Retrieves complete audit trail |

---

### FirebaseService

Manages push notifications via Firebase Cloud Messaging.

**Notification Types:**

| Method | Trigger |
|--------|---------|
| `notifyTaskCreated(workerTokens, title, budget)` | New task available in marketplace |
| `notifyTaskAccepted(clientToken, workerName, title)` | Worker accepted client's task |
| `notifyWorkerEnRoute(clientToken, workerName, title)` | Worker started traveling |
| `notifyWorkerArrived(clientToken, workerName, title)` | Worker arrived at location |
| `notifyWorkSubmitted(clientToken, title)` | Work submitted for verification |
| `notifyAIVerified(clientToken, workerToken, title, approved, confidence)` | AI verification complete |
| `notifyPaymentReleased(workerToken, title, amount)` | Payment sent to worker |
| `notifyDispute(clientToken, workerToken, title, reason)` | Dispute filed |

---

### StorageService

Handles file uploads and retrieval via Cloudinary.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `uploadFile(file, folder)` | Uploads file to Cloudinary, returns public HTTPS URL |
| `getFileHash(buffer)` | Generates SHA-256 hash for blockchain verification |
| `deleteFile(publicIdOrUrl)` | Removes file from Cloudinary |
| `getFile(url)` | Retrieves file as buffer |
| `getOptimizedUrl(url, options)` | Returns optimized/transformed image URL |

---

### WorkspacesService

Multi-tenancy support with team collaboration features.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `createWorkspace(userId, name, description)` | Creates workspace with owner as first member |
| `getUserWorkspaces(userId)` | Lists all workspaces user belongs to |
| `inviteMember(workspaceId, inviterId, email, password, role)` | Invites/creates user and adds to workspace |
| `acceptInvitation(userId, workspaceId)` | User accepts workspace invitation |
| `removeMember(workspaceId, removerId, memberUserId)` | Removes member from workspace |
| `updateMemberRole(workspaceId, updaterId, memberUserId, newRole)` | Changes member's role |
| `setActiveWorkspace(userId, workspaceId)` | Sets user's current active workspace |

---

### ExportService

Exports workspace data to Google Sheets.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `exportWorkspaceToSheets(workspaceId, userEmail)` | Creates Google Sheet with task data |

---

## API Endpoints

### Authentication (`/v0/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Authenticate user | No |
| POST | `/fcm-token` | Update FCM token | Yes |
| GET | `/check-email/:email` | Check email availability | No |

### Tasks (`/v0/tasks`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/` | List open tasks | No | - |
| POST | `/` | Create task | Yes | CLIENT, ADMIN |
| GET | `/my-tasks` | Get user's tasks | Yes | All |
| GET | `/:id` | Get task details | No | - |
| PUT | `/:id` | Update task | Yes | CLIENT, ADMIN |
| DELETE | `/:id` | Delete task | Yes | CLIENT, ADMIN |
| POST | `/:id/accept` | Accept task | Yes | WORKER, ADMIN |
| POST | `/:id/en-route` | Start journey | Yes | WORKER, ADMIN |
| POST | `/:id/arrived` | Mark arrived | Yes | WORKER, ADMIN |
| POST | `/:id/start` | Start work | Yes | WORKER, ADMIN |
| POST | `/:id/submit` | Submit work | Yes | WORKER, ADMIN |
| POST | `/:id/dispute` | Dispute task | Yes | CLIENT, ADMIN |
| POST | `/enhance-description` | AI enhance description | Yes | CLIENT, ADMIN |

### Workspaces (`/v0/workspaces`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List user's workspaces | Yes |
| POST | `/` | Create workspace | Yes |
| GET | `/active` | Get active workspace | Yes |
| POST | `/active/:id` | Set active workspace | Yes |
| GET | `/:id` | Get workspace details | Yes |
| PUT | `/:id` | Update workspace | Yes |
| DELETE | `/:id` | Delete workspace | Yes |
| POST | `/:id/invite` | Invite member | Yes |
| GET | `/invitations/pending` | Get pending invitations | Yes |
| POST | `/invitations/:workspaceId/accept` | Accept invitation | Yes |
| POST | `/invitations/:workspaceId/reject` | Reject invitation | Yes |
| DELETE | `/:id/members/:userId` | Remove member | Yes |

### Export (`/v0/export`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/workspace/:id/sheets` | Export to Google Sheets | Yes |

---

## Data Flow Diagrams

### Task Lifecycle Flow

```mermaid
stateDiagram-v2
    [*] --> OPEN: Client creates task
    OPEN --> ACCEPTED: Worker accepts
    ACCEPTED --> EN_ROUTE: Worker starts journey
    EN_ROUTE --> ARRIVED: Worker arrives (geofence verified)
    ARRIVED --> IN_PROGRESS: Worker starts work
    IN_PROGRESS --> SUBMITTED: Worker uploads after images
    SUBMITTED --> VERIFIED: AI verifies repair
    VERIFIED --> PAID: Payment released (after 24h or no dispute)
    VERIFIED --> DISPUTED: Client disputes within 24h
    DISPUTED --> PAID: Admin resolves in favor of worker
    DISPUTED --> OPEN: Admin resolves in favor of client
    OPEN --> CANCELLED: Client cancels task
```

### Work Submission and Verification Flow

```mermaid
sequenceDiagram
    participant W as Worker
    participant API as Backend API
    participant S as StorageService
    participant AI as AI Service
    participant BC as Blockchain
    participant FB as Firebase

    W->>API: POST /tasks/:id/submit (afterImages)
    API->>S: uploadFile(afterImages)
    S-->>API: imageUrls, imageHashes
    
    API->>API: Update task status to SUBMITTED
    
    API->>AI: analyzeDefect(beforeUrls, afterUrls)
    AI-->>API: verification result
    
    API->>API: Update task with AI result
    API->>API: Set status to VERIFIED
    API->>API: Set 24h dispute deadline
    
    par Blockchain Recording
        API->>BC: recordWorkSubmission(taskId, hashes)
        API->>BC: recordAIVerification(taskId, confidence, approved)
    and Notification
        API->>FB: notifyWorkSubmitted(clientToken)
    end
    
    API-->>W: { task, aiResult }
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Backend API
    participant DB as PostgreSQL
    participant JWT as JWT Service

    C->>API: POST /auth/register
    API->>API: Hash password (bcrypt)
    API->>DB: Create user
    API->>DB: Create default workspace
    API->>JWT: Generate token
    API-->>C: { access_token, user, workspaces }

    Note over C,API: Subsequent requests

    C->>API: Request with Authorization header
    API->>JWT: Validate token
    JWT-->>API: User payload
    API->>API: Process request
    API-->>C: Response
```

### Mobile and Web Client Integration

```mermaid
graph LR
    subgraph "Same Network"
        WEB[Web App<br/>localhost:5173]
        MOBILE[Mobile App<br/>React Native]
        BACKEND[Backend API<br/>localhost:3001]
    end

    subgraph "Configuration"
        ENV[".env<br/>API_URL"]
    end

    WEB -->|HTTP/REST| BACKEND
    MOBILE -->|HTTP/REST| BACKEND
    ENV -->|Configure| WEB
    ENV -->|Configure| MOBILE
```

Both web and mobile clients connect to the same backend API using the network IP address or hostname. For local development:

```
Web: http://localhost:3001/v0
Mobile: http://<machine-ip>:3001/v0
```

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ TASK : creates
    USER ||--o{ TASK : works_on
    USER ||--o{ WORKSPACE_MEMBER : belongs_to
    USER ||--o{ WORKSPACE : owns
    
    WORKSPACE ||--o{ WORKSPACE_MEMBER : has
    WORKSPACE ||--o{ TASK : contains
    
    USER {
        uuid id PK
        string email UK
        string password
        string name
        enum role
        string walletAddress UK
        string stripeAccountId UK
        float rating
        int completedTasks
        string fcmToken
        uuid activeWorkspaceId
    }
    
    WORKSPACE {
        uuid id PK
        string name
        string description
        string logo
        uuid ownerId FK
    }
    
    WORKSPACE_MEMBER {
        uuid id PK
        uuid userId FK
        uuid workspaceId FK
        enum role
        enum inviteStatus
        uuid invitedById
        datetime joinedAt
    }
    
    TASK {
        uuid id PK
        string title
        string description
        string category
        float budget
        uuid clientId FK
        uuid workerId FK
        uuid workspaceId FK
        enum status
        string[] beforeImages
        string afterImageUrl
        json aiVerification
        boolean disputed
        datetime deadline
    }
```

### Enums

**Role:**
- `CLIENT` - Posts tasks and pays
- `WORKER` - Completes tasks
- `ADMIN` - Resolves disputes

**TaskStatus:**
- `OPEN` - Posted, awaiting worker
- `ACCEPTED` - Worker claimed it
- `EN_ROUTE` - Worker traveling to location
- `ARRIVED` - Worker at location
- `IN_PROGRESS` - Work started
- `SUBMITTED` - After images uploaded
- `VERIFIED` - AI approved
- `PAID` - Payment released
- `DISPUTED` - Client disputed
- `CANCELLED` - Task cancelled

**WorkspaceRole:**
- `OWNER` - Full control
- `ADMIN` - Manage members/tasks
- `MEMBER` - View and work on tasks

---

## Authentication and Security

### JWT Strategy

The application uses JWT (JSON Web Tokens) for stateless authentication.

**Token Payload:**
```typescript
{
  email: string,
  sub: string,    // User ID
  role: Role,     // CLIENT | WORKER | ADMIN
  iat: number,    // Issued at
  exp: number     // Expiration
}
```

**Request Authorization:**
```
Authorization: Bearer <jwt_token>
```

### Guards

1. **JwtAuthGuard** - Validates JWT token and extracts user
2. **RolesGuard** - Enforces role-based access control

### Security Measures

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcrypt with 10 salt rounds |
| Token Expiration | Configurable via JWT_EXPIRES_IN |
| Input Validation | class-validator with whitelist |
| CORS | Enabled for cross-origin requests |
| SQL Injection Prevention | Prisma parameterized queries |
| File Upload Security | Multer with type validation |

---

## Integration Points

### AI Service Integration

The backend communicates with an external AI service for defect detection and repair verification.

**Endpoint:** `${AI_SERVICE_URL}/analyze`

**Request:** Multipart form with before_images and after_images

**Response:**
```json
{
  "verdict": "FIXED|PARTIAL|NOT_FIXED|NO_DEFECT",
  "summary": "Human-readable summary",
  "total_defects": 3,
  "fixed_count": 2,
  "defects": [
    {
      "description": "Crack in wall",
      "bbox": [x, y, width, height],
      "phase2_deep_learning": {
        "verdict": "FIXED",
        "confidence": 0.95
      }
    }
  ]
}
```

### Blockchain Integration

Uses Ethers.js to interact with a TaskEscrow smart contract for immutable audit logging.

**Contract Methods:**
- `recordTaskCreation`
- `recordTaskAcceptance`
- `recordWorkSubmission`
- `recordAIVerification`
- `recordPaymentRelease`
- `recordDispute`
- `getTaskAudit`

### Firebase Cloud Messaging

Push notifications are sent via Firebase Admin SDK.

**Configuration Requirements:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

---

## Environment Configuration

```env
# =============================================================================
# DATABASE (Supabase - FREE: 500MB storage, 2 projects)
# =============================================================================
# Sign up: https://supabase.com
# Get connection string from: Settings > Database > Connection string
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# =============================================================================
# JWT AUTHENTICATION
# =============================================================================
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# =============================================================================
# CLOUDINARY (Image Storage - FREE: 25GB storage + 25GB bandwidth/month)
# =============================================================================
# Sign up: https://cloudinary.com/users/register_free
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret

# =============================================================================
# FIREBASE (Push Notifications - FREE)
# =============================================================================
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# =============================================================================
# BLOCKCHAIN (Polygon Amoy Testnet - FREE)
# =============================================================================
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=0x_YOUR_WALLET_PRIVATE_KEY
TASKESCROW_CONTRACT_ADDRESS=0x_DEPLOYED_CONTRACT_ADDRESS

# =============================================================================
# AI SERVICE
# =============================================================================
AI_SERVICE_URL=http://localhost:8003

# =============================================================================
# APP CONFIGURATION
# =============================================================================
PORT=3001
NODE_ENV=development
```

---

## Optimizations

### Database Optimizations

1. **Indexed Fields:**
   - `User.email` - Fast login lookups
   - `User.role` - Role-based queries
   - `Task.status` - Status filtering
   - `Task.category` - Category filtering
   - `Task.clientId`, `Task.workerId` - Relationship queries
   - `WorkspaceMember.inviteStatus` - Invitation filtering

2. **Prisma Query Optimization:**
   - Selective field inclusion with `select`
   - Relation counting with `_count`
   - Transaction support for multi-table operations

### API Optimizations

1. **Async Non-Blocking Operations:**
   - Blockchain recording runs asynchronously (non-blocking)
   - Firebase notifications sent in parallel
   - Image uploads processed concurrently

2. **Request Validation:**
   - Whitelist validation strips unknown properties
   - Transform enabled for automatic type coercion
   - Early validation prevents unnecessary processing

3. **File Handling:**
   - Memory-efficient streaming for large files
   - Hash computed during upload (single pass)
   - Batch image processing support (up to 10 images)

---

## Deployment

### Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

### Production

```bash
# Build
npm run build

# Start production server
npm run start:prod
```

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/fixit
      - MINIO_ENDPOINT=minio
    depends_on:
      - db
      - minio

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: fixit

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start with hot-reload |
| `npm run start:prod` | Start production build |
| `npm run build` | Compile TypeScript |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run lint` | Run ESLint |

---

