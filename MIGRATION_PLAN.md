# Migration Plan: Decentralized Micro-Task Escrow Platform

**From**: Infrastructure Verification System  
**To**: Instant Payment Micro-Task Marketplace  
**Core Value**: Workers get paid in 10 seconds via AI verification

---

## New Platform Flow

```
1. Client posts task + deposits funds (smart contract escrow)
           ↓
2. Worker accepts task
           ↓
3. Worker uploads "before" image (starting state)
           ↓
4. Worker completes work + uploads "after" image
           ↓
5. AI auto-verifies (~10 seconds)
           ↓
6. AI confidence > 90%? → Funds released INSTANTLY
           ↓
7. Client has 24h to dispute → If disputed, human arbitration
```

---

## Current State Analysis

### What We KEEP 
| Component | Location | Reason |
|-----------|----------|--------|
| AI Service | `apps/ai-service/` | Perfect for task verification |
| Auth system | `apps/backend/src/auth/` | JWT works, just change roles |
| Storage | `apps/backend/src/storage/` | MinIO for images |
| Blockchain utils | `apps/backend/src/blockchain/` | Wallet & contract calls |
| UI components | `apps/web/src/components/ui/` | Buttons, Cards, Modals |
| AI Verification UI | `apps/web/src/components/AiVerification.tsx` | Shows AI result |

### What We REMOVE 
| Component | Location | Reason |
|-----------|----------|--------|
| Projects module | `apps/backend/src/projects/` | Tasks replace projects |
| Proofs module | `apps/backend/src/proofs/` | Merged into tasks |
| Contracts module | `apps/backend/src/contracts/` | Simplify to single escrow |
| Multi-milestone logic | everywhere | Tasks are single-step |
| Verifier voting | everywhere | AI is primary decision maker |
| Donor tracking | everywhere | Not needed |
| Project pages | `apps/web/src/pages/` | Replace with marketplace |

### What We MODIFY 
| Component | Change |
|-----------|--------|
| User roles | ORGANIZER/VERIFIER/DONOR → CLIENT/WORKER |
| Prisma schema | Project/Milestone/Proof → Task |
| Smart contracts | ProjectFactory → TaskEscrow |
| Frontend pages | Project dashboard → Task marketplace |

---

## Phase 1: Database Refactor

### 1.1 Update Prisma Schema

**File**: `apps/backend/prisma/schema.prisma`

**Remove**:
```prisma
// DELETE these models
model Project { ... }
model Milestone { ... }
model Proof { ... }
model Vote { ... }
```

**Add**:
```prisma
enum Role {
  CLIENT
  WORKER
  ADMIN
}

enum TaskStatus {
  OPEN           // Posted, awaiting worker
  ACCEPTED       // Worker claimed it
  IN_PROGRESS    // Before image uploaded
  SUBMITTED      // After image uploaded, AI verifying
  VERIFIED       // AI approved
  PAID           // Funds released
  DISPUTED       // Client disputed
  CANCELLED      // Cancelled
}

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  password        String
  name            String
  role            Role
  walletAddress   String?  @unique
  rating          Float    @default(0)
  completedTasks  Int      @default(0)
  
  clientTasks     Task[]   @relation("ClientTasks")
  workerTasks     Task[]   @relation("WorkerTasks")
  
  createdAt       DateTime @default(now())
}

model Task {
  id              String     @id @default(uuid())
  title           String
  description     String
  category        String
  budget          Float
  
  clientId        String
  client          User       @relation("ClientTasks", fields: [clientId], references: [id])
  workerId        String?
  worker          User?      @relation("WorkerTasks", fields: [workerId], references: [id])
  
  status          TaskStatus @default(OPEN)
  contractAddress String?
  
  beforeImageUrl  String?
  afterImageUrl   String?
  aiVerification  Json?
  
  disputed        Boolean    @default(false)
  disputeReason   String?
  disputeDeadline DateTime?
  
  createdAt       DateTime   @default(now())
  acceptedAt      DateTime?
  completedAt     DateTime?
  paidAt          DateTime?
}
```

### 1.2 Run Migration

```bash
cd apps/backend
npx prisma migrate dev --name migrate_to_tasks
```

---

## Phase 2: Backend Refactor

### 2.1 Delete Old Modules

```bash
cd apps/backend/src
rm -rf projects/
rm -rf contracts/
```

### 2.2 Rename proofs → tasks

```bash
mv proofs/ tasks/
```

### 2.3 Create New Tasks Service

**File**: `apps/backend/src/tasks/tasks.service.ts`

```typescript
@Injectable()
export class TasksService {
  
  // CLIENT: Create a new task
  async createTask(clientId: string, dto: CreateTaskDto) {
    // 1. Create task in DB (OPEN)
    // 2. Deploy escrow contract
    // 3. Return task
  }

  // WORKER: Accept a task
  async acceptTask(taskId: string, workerId: string) {
    // 1. Verify task is OPEN
    // 2. Set worker, status = ACCEPTED
  }

  // WORKER: Upload before image
  async startWork(taskId: string, beforeImage: File) {
    // 1. Upload to storage
    // 2. Status = IN_PROGRESS
  }

  // WORKER: Submit completed work
  async submitWork(taskId: string, afterImage: File) {
    // 1. Upload to storage
    // 2. Status = SUBMITTED
    // 3. Call AI service
    // 4. If AI > 90%: release funds, status = VERIFIED
    // 5. Set disputeDeadline = now + 24h
  }

  // CLIENT: Dispute within 24h
  async disputeTask(taskId: string, clientId: string, reason: string) {
    // 1. Verify within deadline
    // 2. Status = DISPUTED
    // 3. Freeze funds
  }

  // ADMIN: Resolve dispute
  async resolveDispute(taskId: string, approveWorker: boolean) {
    // Release to worker or refund client
  }
  
  // Get tasks for marketplace
  async getOpenTasks(filters: TaskFilters) { }
  
  // Get my tasks (client or worker)
  async getMyTasks(userId: string, role: Role) { }
}
```

### 2.4 Update Tasks Controller

**File**: `apps/backend/src/tasks/tasks.controller.ts`

```typescript
@Controller('tasks')
export class TasksController {

  @Post()                    // Create task (CLIENT)
  @Get()                     // List open tasks
  @Get(':id')                // Get task details
  @Post(':id/accept')        // Accept task (WORKER)
  @Post(':id/start')         // Upload before image
  @Post(':id/submit')        // Upload after image + AI verify
  @Post(':id/dispute')       // Dispute (CLIENT, 24h window)
  @Post(':id/resolve')       // Resolve dispute (ADMIN)
}
```

### 2.5 Update Auth Roles

**File**: `apps/backend/src/auth/roles.decorator.ts`

```typescript
// Remove: ORGANIZER, VERIFIER, DONOR
// Keep: ADMIN
// Add: CLIENT, WORKER
```

### 2.6 AI Verification Integration

**Already done!** Just call it from `submitWork()`:

```typescript
const aiResult = await this.aiVerificationService.verifyRepair(
  taskId, beforeImageUrl, afterImageUrl
);

if (aiResult.confidence >= 0.9) {
  // Release funds via smart contract
  await this.blockchainService.releaseFunds(contractAddress);
  // Update status = VERIFIED → PAID
}
```

---

## Phase 3: Smart Contracts

### 3.1 Blockchain Architecture Changes

**MAJOR CHANGES REQUIRED** - Complete redesign from complex to simple.

#### Current Architecture (What You Likely Have)

```solidity
// Factory Pattern + Multi-Milestone + Voting

ProjectFactory.sol
  ├─ deployProject() → creates new Project contracts
  ├─ Tracks all projects
  └─ Events: ProjectCreated

Project.sol  
  ├─ Multiple Milestones array
  ├─ mapping(milestoneId => Proof[])
  ├─ mapping(milestoneId => mapping(verifier => Vote))
  ├─ Voting logic (N-of-M consensus)
  ├─ Partial fund releases per milestone
  └─ Complex state: Created → Funding → Active → Voting → Approved
```

**Problems**:
- Heavy: Lots of state, expensive gas
- Slow: Waiting for verifiers to vote
- Complex: Multiple milestones, voting quorum logic

---

#### New Architecture (What We Need)

```solidity
// Direct Deployment + Single Task + AI-Triggered

TaskEscrow.sol
  ├─ One contract = One task
  ├─ Simple state: OPEN → ACCEPTED → COMPLETED → PAID
  ├─ No voting, no milestones
  ├─ AI verification triggers release (via backend)
  ├─ 24h dispute window for client
  └─ Single full payment (no partials)
```

**Benefits**:
- Light: Minimal state, cheap gas
- Fast: AI approves in 10 seconds
- Simple: 6 states, linear flow

---

#### Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Deployment** | Factory creates contracts | Direct deployment per task |
| **Structure** | One project, many milestones | One escrow, one task |
| **Verification** | Human verifiers vote | AI + backend triggers release |
| **Payment** | Staged (milestone-based) | Single full payment |
| **Dispute** | N/A (verifiers already reviewed) | 24h window for client appeal |
| **State Complexity** | 10+ states | 6 simple states |
| **Gas Cost** | High (voting transactions) | Low (minimal transactions) |

---

### 3.2 Delete Old Contracts

```bash
cd packages/contracts
rm -f ProjectFactory.sol Project.sol Governance.sol
```

### 3.3 Create TaskEscrow.sol

**File**: `packages/contracts/TaskEscrow.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * TaskEscrow - AUDIT TRAIL ONLY (No Crypto Payments)
 * 
 * This contract provides decentralized, immutable record-keeping for tasks.
 * Actual payments are handled OFF-CHAIN via Stripe in INR.
 * 
 * Purpose: Transparency & Trust without cryptocurrency complexity
 */
contract TaskEscrow {
    address public backend;  // Trusted backend that records events
    
    struct Task {
        address client;          // Client's wallet address (for identity)
        address worker;          // Worker's wallet address (for identity)
        uint256 amountINR;       // Amount in INR (reference only, not actual payment)
        TaskStatus status;
        uint256 createdAt;
        uint256 completedAt;
        string beforeImageHash;  // IPFS/SHA256 hash of before image
        string afterImageHash;   // IPFS/SHA256 hash of after image
        uint8 aiConfidence;      // AI confidence score (0-100)
        string stripePaymentIntentId;  // Link to actual Stripe payment
        string stripeTransferId;       // Link to Stripe transfer to worker
    }
    
    enum TaskStatus { 
        CREATED,          // Task posted
        ACCEPTED,         // Worker accepted
        WORK_SUBMITTED,   // Before/after images uploaded
        AI_VERIFIED,      // AI approved the work
        PAYMENT_RELEASED, // Stripe payment completed
        DISPUTED,         // Client disputed
        CANCELLED         // Task cancelled
    }
    
    // taskId (bytes32 hash) => Task data
    mapping(bytes32 => Task) public tasks;
    
    // Events for transparency
    event TaskCreated(
        bytes32 indexed taskId,
        address indexed client,
        uint256 amountINR,
        string stripePaymentIntentId,
        uint256 timestamp
    );
    
    event TaskAccepted(
        bytes32 indexed taskId,
        address indexed worker,
        uint256 timestamp
    );
    
    event WorkSubmitted(
        bytes32 indexed taskId,
        string beforeImageHash,
        string afterImageHash,
        uint256 timestamp
    );
    
    event AIVerified(
        bytes32 indexed taskId,
        uint8 confidence,
        bool approved,
        uint256 timestamp
    );
    
    event PaymentReleased(
        bytes32 indexed taskId,
        address indexed worker,
        uint256 amountINR,
        string stripeTransferId,
        uint256 timestamp
    );
    
    event TaskDisputed(
        bytes32 indexed taskId,
        string reason,
        uint256 timestamp
    );
    
    modifier onlyBackend() {
        require(msg.sender == backend, "Only backend can record");
        _;
    }
    
    constructor(address _backend) {
        backend = _backend;
    }
    
    // Record task creation (called by backend after Stripe escrow created)
    function recordTaskCreation(
        bytes32 taskId,
        address client,
        uint256 amountINR,
        string memory stripePaymentIntentId
    ) external onlyBackend {
        require(tasks[taskId].client == address(0), "Task already exists");
        
        tasks[taskId] = Task({
            client: client,
            worker: address(0),
            amountINR: amountINR,
            status: TaskStatus.CREATED,
            createdAt: block.timestamp,
            completedAt: 0,
            beforeImageHash: "",
            afterImageHash: "",
            aiConfidence: 0,
            stripePaymentIntentId: stripePaymentIntentId,
            stripeTransferId: ""
        });
        
        emit TaskCreated(taskId, client, amountINR, stripePaymentIntentId, block.timestamp);
    }
    
    // Record worker acceptance
    function recordTaskAcceptance(
        bytes32 taskId,
        address worker
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.CREATED, "Invalid status");
        
        task.worker = worker;
        task.status = TaskStatus.ACCEPTED;
        
        emit TaskAccepted(taskId, worker, block.timestamp);
    }
    
    // Record work submission with image hashes
    function recordWorkSubmission(
        bytes32 taskId,
        string memory beforeHash,
        string memory afterHash
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.ACCEPTED, "Invalid status");
        
        task.beforeImageHash = beforeHash;
        task.afterImageHash = afterHash;
        task.status = TaskStatus.WORK_SUBMITTED;
        task.completedAt = block.timestamp;
        
        emit WorkSubmitted(taskId, beforeHash, afterHash, block.timestamp);
    }
    
    // Record AI verification result
    function recordAIVerification(
        bytes32 taskId,
        uint8 confidence,
        bool approved
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.WORK_SUBMITTED, "Invalid status");
        
        task.aiConfidence = confidence;
        task.status = TaskStatus.AI_VERIFIED;
        
        emit AIVerified(taskId, confidence, approved, block.timestamp);
    }
    
    // Record payment release (called AFTER Stripe completes transfer)
    function recordPaymentRelease(
        bytes32 taskId,
        string memory stripeTransferId
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.AI_VERIFIED, "Invalid status");
        
        task.stripeTransferId = stripeTransferId;
        task.status = TaskStatus.PAYMENT_RELEASED;
        
        emit PaymentReleased(
            taskId,
            task.worker,
            task.amountINR,
            stripeTransferId,
            block.timestamp
        );
    }
    
    // Record dispute
    function recordDispute(
        bytes32 taskId,
        string memory reason
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.AI_VERIFIED || 
            task.status == TaskStatus.PAYMENT_RELEASED,
            "Invalid status"
        );
        
        task.status = TaskStatus.DISPUTED;
        
        emit TaskDisputed(taskId, reason, block.timestamp);
    }
    
    // Public audit function - ANYONE can verify task history
    function getTaskAudit(bytes32 taskId) external view returns (
        address client,
        address worker,
        uint256 amountINR,
        TaskStatus status,
        uint256 createdAt,
        uint256 completedAt,
        string memory beforeImageHash,
        string memory afterImageHash,
        uint8 aiConfidence,
        string memory stripePaymentIntentId,
        string memory stripeTransferId
    ) {
        Task memory task = tasks[taskId];
        return (
            task.client,
            task.worker,
            task.amountINR,
            task.status,
            task.createdAt,
            task.completedAt,
            task.beforeImageHash,
            task.afterImageHash,
            task.aiConfidence,
            task.stripePaymentIntentId,
            task.stripeTransferId
        );
    }
    
    // Verify image hash (anyone can check if images were tampered)
    function verifyImageHash(
        bytes32 taskId,
        string memory imageHash,
        bool isBefore
    ) external view returns (bool) {
        Task memory task = tasks[taskId];
        if (isBefore) {
            return keccak256(bytes(task.beforeImageHash)) == keccak256(bytes(imageHash));
        } else {
            return keccak256(bytes(task.afterImageHash)) == keccak256(bytes(imageHash));
        }
    }
}
```

**Key Changes from Original**:
- NO `payable` constructor (doesn't handle ETH)
- NO `transfer()` calls (no crypto payments)
- Records Stripe payment IDs instead
- Backend is trusted to record events
- Focus on immutability and transparency
- Anyone can audit task history

---

### 3.4 Backend Integration Changes

**Before** (with voting):
```typescript
// Listen for verifier votes
projectContract.on('VoteSubmitted', async (milestoneId, verifier, vote) => {
    await updateVoteInDatabase(milestoneId, verifier, vote);
    const voteCount = await countVotes(milestoneId);
    if (voteCount >= requiredVotes) {
        // Milestone automatically approved by contract
    }
});
```

**After** (AI-triggered):
```typescript
// AI verifies → Backend triggers release
const aiResult = await aiService.verifyRepair(beforeUrl, afterUrl);

if (aiResult.confidence >= 0.9) {
    const tx = await taskEscrowContract.releaseFunds(
        Math.floor(aiResult.confidence * 100)
    );
    await tx.wait();
    
    // Update task status in DB
    await updateTask(taskId, { 
        status: 'PAID',
        paidAt: new Date() 
    });
}

// Listen for disputes
taskEscrowContract.on('Disputed', async (client, reason) => {
    // Notify admin for manual review
    await notifyAdmin(taskId, reason);
});
```

---

### 3.5 Testing Strategy

```bash
# Test flow
1. Deploy escrow with 0.1 ETH
2. Worker accepts
3. Worker submits work (before/after hashes)
4. Backend calls releaseFunds(95) # 95% confidence
5. Verify worker received funds

# Test dispute flow
1. Same as above but...
2. Client disputes before 24h
3. Admin resolves (approve/reject)
4. Funds go to correct party
```

---

### 3.6 Payment Architecture (India-Specific)

**IMPORTANT**: The blockchain is used ONLY for decentralization and audit trail, NOT for payments.

```
Real Money Flow (Stripe INR):
Client deposits ₹500 → Stripe Escrow → AI verifies → Stripe pays worker ₹500

Blockchain Records (Audit Trail):
Smart contract stores: Task ID, Client, Worker, Amount (INR), Status, AI Verification Hash
```

**Why This Hybrid Approach?**

| Aspect | Blockchain | Stripe |
|--------|-----------|---------|
| **Purpose** | Audit trail, transparency | Actual payments |
| **Currency** | None (just records) | INR (Indian Rupees) |
| **Users need** | Nothing (backend manages) | Bank account/UPI |
| **Cost** | Minimal gas (testnet) | Stripe fees (~2%) |
| **Benefit** | Immutable records | Real money, instant |

**Smart Contract Role**:
- Records task creation (timestamp, parties, amount in INR)
- Records AI verification result (confidence, verdict, image hashes)
- Records payment release (timestamp, Stripe transaction ID)
- Creates transparent, tamper-proof audit log
- No actual cryptocurrency involved

**Stripe Role**:
- Holds client's INR in escrow
- Releases INR to worker after AI verification
- Handles UPI, cards, net banking
- Worker receives real money in their bank account

---

### 3.7 Stripe Integration (Real Payments)

**Install Dependencies**:
```bash
npm install stripe @stripe/stripe-js
```

**Backend Service**: `apps/backend/src/payments/stripe.service.ts`

```typescript
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
  }

  // Client creates task + deposits funds
  async createEscrow(taskId: string, amountINR: number, clientEmail: string) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountINR * 100, // Convert to paise
      currency: 'inr',
      payment_method_types: ['card', 'upi'],
      capture_method: 'manual', // Hold funds (escrow)
      metadata: { taskId, clientEmail }
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  }

  // Release funds to worker after AI verification
  async releaseFunds(
    paymentIntentId: string,
    workerAccountId: string,
    amountINR: number
  ) {
    // Capture the held payment
    await this.stripe.paymentIntents.capture(paymentIntentId);
    
    // Transfer to worker's Stripe Connect account
    const transfer = await this.stripe.transfers.create({
      amount: amountINR * 100,
      currency: 'inr',
      destination: workerAccountId
    });
    
    return transfer.id;
  }

  // Create Stripe Connect account for worker
  async createWorkerAccount(email: string, name: string, phone: string) {
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: 'IN',
      email,
      capabilities: { transfers: { requested: true } }
    });
    
    const accountLink = await this.stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/onboarding/refresh`,
      return_url: `${process.env.FRONTEND_URL}/onboarding/complete`,
      type: 'account_onboarding'
    });
    
    return { accountId: account.id, onboardingUrl: accountLink.url };
  }
}
```

**Updated Task Creation Flow**:

```typescript
async createTask(clientId: string, dto: CreateTaskDto) {
  // 1. Create task in database
  const task = await this.prisma.task.create({ ... });
  
  // 2. Create Stripe escrow (real INR payment)
  const { paymentIntentId, clientSecret } = 
    await this.stripeService.createEscrow(task.id, dto.budget, client.email);
  
  // 3. Record on blockchain (audit trail only)
  const taskHash = keccak256(task.id);
  await this.blockchainService.recordTaskCreation(
    taskHash,
    client.walletAddress,
    dto.budget,
    paymentIntentId  // Link to Stripe payment
  );
  
  return { task, clientSecret };
}
```

**Payment Release Flow**:

```typescript
async submitWork(taskId: string, afterImage: File) {
  const aiResult = await this.aiService.verifyRepair(beforeUrl, afterUrl);
  
  if (aiResult.confidence >= 0.9) {
    // 1. Release funds via Stripe (real money)
    const transferId = await this.stripeService.releaseFunds(
      task.stripePaymentIntentId,
      worker.stripeAccountId,
      task.budget
    );
    
    // 2. Record on blockchain (audit)
    await this.blockchainService.recordPaymentRelease(
      taskHash,
      transferId
    );
    
    /  // 3. Notify via Firebase
    await this.firebaseService.notifyPaymentReceived(worker.id, task.budget);
  }
}
```

---

### 3.8 Why Blockchain + Stripe is Perfect for India

**Benefits**:
1. Users pay/receive in INR (no crypto)
2. UPI integration (familiar for Indian users)
3. Blockchain provides tamper-proof audit trail
4. Platform can't hide/manipulate transactions
5. Anyone can verify task history on-chain
6. Decentralized trust without cryptocurrency

**Cost Structure**:
- Stripe fee: ~2% (₹10 on ₹500 task)
- Blockchain gas: Negligible on testnet
- Total platform cost: Transparent and low

---

## Phase 4: Frontend Refactor

### 4.1 Delete Old Pages

```bash
cd apps/web/src/pages
rm -rf Projects/ Verification/ Donors/
```

### 4.2 Create New Pages

| Page | Route | Purpose |
|------|-------|---------|
| Marketplace | `/marketplace` | Browse open tasks |
| PostTask | `/post-task` | Client creates task |
| MyTasks | `/my-tasks` | Client views their tasks |
| MyJobs | `/my-jobs` | Worker views accepted jobs |
| TaskDetails | `/tasks/:id` | Full task view + AI result |
| Disputes | `/admin/disputes` | Admin resolves disputes |

### 4.3 New Components Needed

```
components/
├── TaskCard.tsx          # Task in marketplace grid
├── TaskStatusBadge.tsx   # Visual status indicator
├── WorkSubmissionForm.tsx # Upload before/after
├── DisputeModal.tsx      # Client disputes
├── CountdownTimer.tsx    # 24h dispute window
├── PaymentSuccess.tsx    # "You got paid!" 
└── AiVerification.tsx    # Already exists 
```

### 4.4 Update Navigation

**Remove**:
- Projects link
- Verification link
- Donor dashboard

**Add**:
- Marketplace (public)
- Post Task (CLIENT)
- My Tasks (CLIENT)
- My Jobs (WORKER)
- Disputes (ADMIN)

---

## Phase 5: API Endpoints Summary

### Tasks API

| Method | Endpoint | Role | Action |
|--------|----------|------|--------|
| POST | `/tasks` | CLIENT | Create task + deploy escrow |
| GET | `/tasks` | PUBLIC | List open tasks |
| GET | `/tasks/:id` | PUBLIC | Get task details |
| POST | `/tasks/:id/accept` | WORKER | Accept task |
| POST | `/tasks/:id/start` | WORKER | Upload before image |
| POST | `/tasks/:id/submit` | WORKER | Upload after + AI verify |
| POST | `/tasks/:id/dispute` | CLIENT | Dispute (24h window) |
| POST | `/tasks/:id/resolve` | ADMIN | Resolve dispute |

### Auth API (unchanged)

| Method | Endpoint | Action |
|--------|----------|--------|
| POST | `/auth/register` | Register (role: CLIENT or WORKER) |
| POST | `/auth/login` | Login |

---

## Phase 6: Environment Variables

**Add to `.env`**:
```bash
# AI Service
AI_SERVICE_URL=http://localhost:8003

# Blockchain
ESCROW_DEPLOYER_PRIVATE_KEY=xxx
RPC_URL=http://localhost:8545

# Dispute settings
DISPUTE_WINDOW_HOURS=24
AI_CONFIDENCE_THRESHOLD=90
```

---

## Phase 7: Google Integration (Hackathon Requirements)

### 7.1 Firebase Real-Time Features

**Purpose**: Instant notifications for workers and clients

#### Setup

```bash
npm install firebase firebase-admin
```

**File**: `apps/backend/src/firebase/firebase.service.ts`

```typescript
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      })
    });
  }

  // Notify worker when task is verified
  async notifyTaskVerified(userId: string, taskId: string, amount: number) {
    await admin.firestore()
      .collection('notifications')
      .doc(userId)
      .set({
        type: 'PAYMENT_RECEIVED',
        taskId,
        amount,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  // Real-time task status updates
  async updateTaskStatus(taskId: string, status: TaskStatus) {
    await admin.firestore()
      .collection('tasks')
      .doc(taskId)
      .update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  }
}
```

#### Frontend Integration

**File**: `apps/web/src/hooks/useRealtimeTask.ts`

```typescript
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useRealtimeTask(taskId: string) {
  const [status, setStatus] = useState<TaskStatus>('OPEN');
  
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'tasks', taskId), (snapshot) => {
      const data = snapshot.data();
      if (data) {
        setStatus(data.status);
        
        // Show toast on status change
        if (data.status === 'PAID') {
          showNotification('Payment Received!', `You earned $${data.amount}`);
        }
      }
    });
    
    return () => unsubscribe();
  }, [taskId]);
  
  return status;
}
```

#### Use Cases

1. **Worker Dashboard**: Live updates when AI is verifying
2. **Client Dashboard**: Real-time notification when work is submitted
3. **Payment Alerts**: Instant "You got paid!" notification
4. **Dispute Alerts**: Client notified immediately if work is disputed

---

### 7.2 Google Maps Location Verification

**Purpose**: Ensure workers are physically at the task location before starting work

#### Database Schema Addition

Update Task model in Prisma:

```prisma
model Task {
  // ... existing fields
  
  // Location requirements
  requiresLocation Boolean  @default(false)
  locationLat      Float?
  locationLng      Float?
  locationRadius   Int?     // meters
  locationName     String?  // "123 Main St, City"
  
  // Worker location verification
  workerStartLat   Float?
  workerStartLng   Float?
  locationVerified Boolean  @default(false)
}
```

#### Backend Service

**File**: `apps/backend/src/tasks/location-verification.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class LocationVerificationService {
  
  // Calculate distance between two coordinates
  private calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // Verify worker is at task location
  async verifyLocation(
    taskId: string,
    workerLat: number,
    workerLng: number
  ): Promise<{ verified: boolean; distance: number }> {
    const task = await this.tasksService.findOne(taskId);
    
    if (!task.requiresLocation) {
      return { verified: true, distance: 0 };
    }

    const distance = this.calculateDistance(
      workerLat, workerLng,
      task.locationLat, task.locationLng
    );

    const verified = distance <= task.locationRadius;

    return { verified, distance };
  }

  // Geocode address to coordinates
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    
    throw new Error('Address not found');
  }
}
```

#### API Endpoints

```typescript
@Controller('tasks')
export class TasksController {
  
  @Post(':id/verify-location')
  async verifyLocation(
    @Param('id') taskId: string,
    @Body() body: { lat: number; lng: number }
  ) {
    const result = await this.locationService.verifyLocation(
      taskId, body.lat, body.lng
    );
    
    if (!result.verified) {
      throw new BadRequestException(
        `You are ${Math.round(result.distance)}m away from task location. Must be within ${task.locationRadius}m.`
      );
    }
    
    return { verified: true, distance: result.distance };
  }
}
```

#### Frontend Integration

**File**: `apps/web/src/components/LocationVerification.tsx`

```typescript
import { useState, useEffect } from 'react';
import { GoogleMap, Marker, Circle } from '@react-google-maps/api';

export function LocationVerification({ task, onVerified }) {
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // Get user's current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error('Location access denied');
      }
    );
  }, []);

  const handleVerifyLocation = async () => {
    setVerifying(true);
    try {
      const response = await api.post(`/tasks/${task.id}/verify-location`, {
        lat: userLocation.lat,
        lng: userLocation.lng
      });
      
      if (response.data.verified) {
        onVerified();
      }
    } catch (error) {
      alert(error.response.data.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <h3>Location Verification Required</h3>
      <p>You must be at the task location to start work</p>
      
      <GoogleMap
        center={{ lat: task.locationLat, lng: task.locationLng }}
        zoom={15}
      >
        {/* Task location */}
        <Marker position={{ lat: task.locationLat, lng: task.locationLng }} />
        
        {/* Allowed radius */}
        <Circle
          center={{ lat: task.locationLat, lng: task.locationLng }}
          radius={task.locationRadius}
          options={{
            fillColor: '#4285F4',
            fillOpacity: 0.2,
            strokeColor: '#4285F4'
          }}
        />
        
        {/* User's current location */}
        {userLocation && (
          <Marker 
            position={userLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }}
          />
        )}
      </GoogleMap>

      <button onClick={handleVerifyLocation} disabled={!userLocation || verifying}>
        {verifying ? 'Verifying...' : 'Verify I am at Location'}
      </button>
    </div>
  );
}
```

#### Workflow

**Client Posts Task**:
1. Enters address: "123 Main St, New York"
2. System geocodes to coordinates
3. Client sets radius: 50m (default)
4. Task created with location requirement

**Worker Browses Marketplace**:
1. Sees all tasks (no location restriction)
2. Can accept any task remotely
3. Task status: ACCEPTED

**Worker Attempts to Start Work**:
1. Clicks "Start Work"
2. App requests location permission
3. System verifies worker is within radius
4. If YES: Can upload "before" image, status: IN_PROGRESS
5. If NO: Shows error: "You are 500m away. Must be within 50m."

**Map Display**:
- Blue circle: Allowed work zone
- Red pin: Task location
- Blue dot: Worker's current location

---

### 7.3 Environment Variables

Add to `.env`:

```bash
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Google Maps
GOOGLE_MAPS_API_KEY=your-api-key
DEFAULT_LOCATION_RADIUS=50  # meters
```

---

### 7.4 Google Integration Benefits

**For Hackathon Pitch**:

1. **Firebase Real-Time Database**
   - Workers see payment in < 1 second
   - Clients get instant work submission alerts
   - Creates "wow" factor in demo

2. **Google Maps Platform**
   - Prevents fraud (worker must be on-site)
   - Enables location-based tasks
   - Professional geolocation features

3. **Google Cloud Platform Ecosystem**
   - Firebase + Maps = full Google stack
   - Production-ready infrastructure
   - Scalable from day one

**Demo Script**:
"We leverage Google Cloud Platform for real-time updates via Firebase and location verification via Google Maps. When AI completes verification in 10 seconds, Firebase instantly notifies the worker they've been paid. For on-site tasks, Google Maps ensures workers are physically present before they can start work, preventing fraud."

---

## Implementation Order

### Week 1: Backend Core
1. Update Prisma schema
2. Run migration
3. Create TasksService
4. Create TasksController
5. Update auth roles
6. Test API endpoints

### Week 2: Smart Contracts
1. Write TaskEscrow.sol
2. Write tests
3. Deploy to local Hardhat
4. Integrate with backend
5. Test escrow flow

### Week 3: Frontend + Google Integration
1. Create Marketplace page
2. Create PostTask page
3. Add Firebase real-time updates
4. Integrate Google Maps location verification
5. Create TaskDetails page
6. Work submission flow
7. AI verification display

### Week 4: Polish
1. Real-time notifications (Firebase)
2. Dispute resolution UI
3. Rating system
4. Mobile responsive
5. Deploy

---

## File Changes Summary

### Backend Changes

| Action | Path |
|--------|------|
| DELETE | `src/projects/` |
| DELETE | `src/contracts/` |
| RENAME | `src/proofs/` to `src/tasks/` |
| CREATE | `src/firebase/firebase.service.ts` |
| CREATE | `src/tasks/location-verification.service.ts` |
| MODIFY | `src/auth/roles.decorator.ts` |
| MODIFY | `src/auth/roles.guard.ts` |
| MODIFY | `prisma/schema.prisma` |
| KEEP | `src/storage/` |
| KEEP | `src/blockchain/` |
| KEEP | `src/auth/` (except roles) |

### Frontend Changes

| Action | Path |
|--------|------|
| DELETE | `src/pages/Projects/` |
| DELETE | `src/pages/Verification/` |
| CREATE | `src/pages/Marketplace.tsx` |
| CREATE | `src/pages/PostTask.tsx` |
| CREATE | `src/pages/MyTasks.tsx` |
| CREATE | `src/pages/MyJobs.tsx` |
| CREATE | `src/pages/TaskDetails.tsx` |
| CREATE | `src/components/TaskCard.tsx` |
| CREATE | `src/components/LocationVerification.tsx` |
| CREATE | `src/hooks/useRealtimeTask.ts` |
| KEEP | `src/components/AiVerification.tsx` |
| KEEP | `src/components/ui/` |
| MODIFY | `src/App.tsx` (routes) |
| MODIFY | `src/components/Navbar.tsx` |

### Contracts Changes

| Action | Path |
|--------|------|
| DELETE | `ProjectFactory.sol` |
| DELETE | `Project.sol` |
| CREATE | `TaskEscrow.sol` |

---

## Success Metrics

| Metric | Target | Reason |
|--------|--------|--------|
| AI verification time | <15 seconds | Speed is our value prop |
| AI accuracy | >90% | Minimize disputes |
| Dispute rate | <5% | Good AI = fewer disputes |
| Task completion time | <24 hours | Fast marketplace |
| Gas cost per task | <$5 | Affordable escrow |
| Location verification accuracy | 10m precision | Google Maps standard |
| Real-time notification latency | <2 seconds | Firebase capability |

---

## Ready to implement?

When you say "go", I'll start with **Phase 1: Database Refactor**.
