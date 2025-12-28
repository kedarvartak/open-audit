-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN     "inviteStatus" "InviteStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "WorkspaceMember_inviteStatus_idx" ON "WorkspaceMember"("inviteStatus");
