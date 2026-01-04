# Open Audit

Open-Audit is a comprehensive platform that connects large contract clients with workers for task-based work while ensuring quality through AI-powered verification, GPS-based presence confirmation, and blockchain-backed audit trails.

Presentation - [`Submission PPT`](./images/SUBMISSION.pdf)

---

## The Problem

In the gig economy, trust is broken on both sides:
- **Clients** can't verify if work was actually completed to standard
- **Workers** risk non-payment for legitimate work
- **No accountability** — disputes are he-said-she-said with no evidence

## Our Solution

Open-Audit creates a **verified work pipeline** where every step is documented and validated:

1. **Client posts a task** with before-images, location, budget, and deadline
2. **Worker accepts** and travels to the location
3. **GPS verification** confirms worker is physically present before work can begin
4. **Worker uploads after-images** upon completion
5. **AI analyzes** before/after images to verify work quality
6. **Supervisor reviews** and approves via web dashboard
7. **Payment released** automatically upon verification

---

## Key Features

- **AI-Powered Verification** — Deep learning compares before/after images to detect defect repairs
- **GPS Geofencing** — Workers must be within specified radius to start work
- **Time-Based Access Control** — Work can only begin within scheduled window
- **Blockchain Audit Trail** — Image hashes stored on-chain for tamper-proof evidence
- **Real-Time Tracking** — Clients can track worker location en route

---

## Platform Components

| Component | Description |
|-----------|-------------|
| **Mobile App** | Worker-facing app for accepting tasks, GPS check-in, and image upload |
| **Web Dashboard** | Client/supervisor portal for task creation, monitoring, and verification |
| **Backend API** | Core business logic, AI integration, and blockchain services |
| **AI Service** | Vision-based defect detection and repair verification |

---

## Technical Documentation

For detailed technical setup and implementation, refer to the individual component READMEs:

| Component | Documentation |
|-----------|---------------|
| Backend API | [`apps/backend/README.md`](./apps/backend/README.md) |
| Web Dashboard | [`apps/web/README.md`](./apps/web/README.md) |
| Mobile App | [`apps/mobile/README.md`](./apps/mobile/README.md) |
| AI Service | [`apps/ai-service/README.md`](./apps/ai-service/README.md) |

