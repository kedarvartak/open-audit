/*
  Warnings:

  - The values [COMPLETED] on the enum `MilestoneStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `amount` on the `Milestone` table. All the data in the column will be lost.
  - You are about to drop the column `gpsLat` on the `Proof` table. All the data in the column will be lost.
  - You are about to drop the column `gpsLong` on the `Proof` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Proof` table. All the data in the column will be lost.
  - You are about to drop the column `ipfsHash` on the `Proof` table. All the data in the column will be lost.
  - Added the required column `title` to the `Milestone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deadline` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fundingGoal` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Project` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `afterImageHash` to the `Proof` table without a default value. This is not possible if the table is not empty.
  - Added the required column `afterImageUrl` to the `Proof` table without a default value. This is not possible if the table is not empty.
  - Added the required column `beforeImageHash` to the `Proof` table without a default value. This is not possible if the table is not empty.
  - Added the required column `beforeImageUrl` to the `Proof` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gpsLatitude` to the `Proof` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gpsLongitude` to the `Proof` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Proof` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'FUNDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('APPROVE', 'REJECT');

-- AlterEnum
BEGIN;
CREATE TYPE "MilestoneStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'REJECTED');
ALTER TABLE "Milestone" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Milestone" ALTER COLUMN "status" TYPE "MilestoneStatus_new" USING ("status"::text::"MilestoneStatus_new");
ALTER TYPE "MilestoneStatus" RENAME TO "MilestoneStatus_old";
ALTER TYPE "MilestoneStatus_new" RENAME TO "MilestoneStatus";
DROP TYPE "MilestoneStatus_old";
ALTER TABLE "Milestone" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProofStatus" ADD VALUE 'AI_ANALYZING';
ALTER TYPE "ProofStatus" ADD VALUE 'AI_APPROVED';
ALTER TYPE "ProofStatus" ADD VALUE 'AI_FLAGGED';
ALTER TYPE "ProofStatus" ADD VALUE 'HUMAN_REVIEW';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VERIFIER';

-- DropForeignKey
ALTER TABLE "Milestone" DROP CONSTRAINT "Milestone_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Proof" DROP CONSTRAINT "Proof_milestoneId_fkey";

-- AlterTable
ALTER TABLE "Milestone" DROP COLUMN "amount",
ADD COLUMN     "blockchainMilestoneId" INTEGER,
ADD COLUMN     "requiredApprovals" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deadline" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fundingGoal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "Proof" DROP COLUMN "gpsLat",
DROP COLUMN "gpsLong",
DROP COLUMN "imageUrl",
DROP COLUMN "ipfsHash",
ADD COLUMN     "afterImageHash" TEXT NOT NULL,
ADD COLUMN     "afterImageUrl" TEXT NOT NULL,
ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiStatus" TEXT,
ADD COLUMN     "beforeImageHash" TEXT NOT NULL,
ADD COLUMN     "beforeImageUrl" TEXT NOT NULL,
ADD COLUMN     "blockchainProofId" INTEGER,
ADD COLUMN     "deviceInfo" TEXT,
ADD COLUMN     "gpsLatitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "gpsLongitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "transactionHash" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "vote" "VoteType" NOT NULL,
    "comment" TEXT,
    "transactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Verification_proofId_idx" ON "Verification"("proofId");

-- CreateIndex
CREATE INDEX "Verification_verifierId_idx" ON "Verification"("verifierId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_proofId_verifierId_key" ON "Verification"("proofId", "verifierId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- CreateIndex
CREATE INDEX "Project_organizerId_idx" ON "Project"("organizerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Proof_milestoneId_idx" ON "Proof"("milestoneId");

-- CreateIndex
CREATE INDEX "Proof_status_idx" ON "Proof"("status");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "Proof"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
