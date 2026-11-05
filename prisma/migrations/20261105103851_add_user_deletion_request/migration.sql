-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING_DELETION';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletionRequestReason" TEXT,
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_deletionRequestedAt_idx" ON "users"("deletionRequestedAt");
