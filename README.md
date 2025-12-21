
### Open-Audit -> Decentralized Fund Release & Verification System

**Open-Audit** is a platform designed to bridge the trust gap in public, institutional, and community-funded infrastructure projects. It ensures that funds are released only after real-world milestones are completed and independently verified.

---

## The Core Problem
Public and CSR-funded projects (e.g., solar panels for schools, water filters, public WiFi) often suffer from:
- **Opaque Verification**: Funds released based on paper reports.
- **Lack of Trust**: Donors cannot independently verify outcomes.
- **Inefficiency**: Honest implementers struggle to prove their work.

## The Solution
**Open-Audit** introduces a **multi-layer Proof-of-Work (PoW)** mechanism:
1.  **Milestone-Based Funding**: Money is held in escrow (INR, not crypto) and released only upon verification.
2.  **AI-Assisted Verification**: Gemini 3.0 Pro analyzes before/after images to flag anomalies.
3.  **Decentralized Voting**: Stakeholders and auditors vote to approve/reject proofs.
4.  **Blockchain Audit**: An immutable ledger records every approval and proof hash.

> **"You never gate physical work — you only gate funding."**

---

## Tech Stack

### Monorepo Structure
This project is organized as a monorepo using **Turbo**:

| Directory | Service | Tech | Description |
|-----------|---------|------|-------------|
| `apps/web` | **Frontend** | React, Tailwind | Dashboard for donors, organizers, and verifiers. |
| `apps/backend` | **Core API** | NestJS, Postgres | Orchestration, user management, and business logic. |
| `apps/engine` | **AI Service** | Python, Gemini Pro | Computer vision analysis for proof verification. |
| `packages/contracts` | **Blockchain** | Solidity, Hardhat | Smart contracts for milestone voting and audit trails. |

### Infrastructure
- **Database**: PostgreSQL
- **Queue**: Redis + BullMQ
- **Storage**: MinIO (S3 Compatible)
- **Payments**: Stripe (Sandbox)

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Docker & Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kedarvartak/gdgvitpune-hackathon.git
   cd gdgvitpune-hackathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Infrastructure (Docker)**
   ```bash
   docker-compose up -d
   ```

4. **Run Development Servers**
   ```bash
   npm run dev
   ```

---

## Workflow

1.  **Project Creation**: Organizer defines milestones (e.g., "Foundation Laid").
2.  **Funding**: Donors contribute via standard payment gateways (INR).
3.  **Execution**: Work happens on the ground.
4.  **Proof Submission**: Organizer uploads geo-tagged before/after photos.
5.  **AI Check**: System analyzes images for validity and context.
6.  **Consensus**: Verifiers vote on the proof.
7.  **Release**: Smart contract triggers fund release upon approval.

---

## Why This Works
- **India-Compatible**: Uses INR and existing banking rails, not crypto payments.
- **Assistive AI**: AI helps humans, it doesn't replace them.
- **Immutable Trust**: Blockchain ensures no retroactive tampering of records.

---

