/*
  Warnings:

  - The values [ORGANIZER,DONOR,VERIFIER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Milestone` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Proof` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Verification` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[walletAddress]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeAccountId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'PAID', 'DISPUTED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('CLIENT', 'WORKER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Milestone" DROP CONSTRAINT "Milestone_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_organizerId_fkey";

-- DropForeignKey
ALTER TABLE "Proof" DROP CONSTRAINT "Proof_milestoneId_fkey";

-- DropForeignKey
ALTER TABLE "Verification" DROP CONSTRAINT "Verification_proofId_fkey";

-- DropForeignKey
ALTER TABLE "Verification" DROP CONSTRAINT "Verification_verifierId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "completedTasks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "walletAddress" TEXT,
ALTER COLUMN "role" DROP DEFAULT;

-- DropTable
DROP TABLE "Milestone";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "Proof";

-- DropTable
DROP TABLE "Verification";

-- DropEnum
DROP TYPE "MilestoneStatus";

-- DropEnum
DROP TYPE "ProjectStatus";

-- DropEnum
DROP TYPE "ProofStatus";

-- DropEnum
DROP TYPE "VoteType";

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "clientId" TEXT NOT NULL,
    "workerId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "contractAddress" TEXT,
    "blockchainTaskId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "beforeImageUrl" TEXT,
    "beforeImageHash" TEXT,
    "afterImageUrl" TEXT,
    "afterImageHash" TEXT,
    "aiVerification" JSONB,
    "aiConfidence" DOUBLE PRECISION,
    "aiVerdict" TEXT,
    "requiresLocation" BOOLEAN NOT NULL DEFAULT false,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "locationRadius" INTEGER,
    "locationName" TEXT,
    "workerStartLat" DOUBLE PRECISION,
    "workerStartLng" DOUBLE PRECISION,
    "locationVerified" BOOLEAN NOT NULL DEFAULT false,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputedAt" TIMESTAMP(3),
    "disputeDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_clientId_idx" ON "Task"("clientId");

-- CreateIndex
CREATE INDEX "Task_workerId_idx" ON "Task"("workerId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "Task"("category");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeAccountId_key" ON "User"("stripeAccountId");

-- CreateIndex
CREATE INDEX "User_stripeAccountId_idx" ON "User"("stripeAccountId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
