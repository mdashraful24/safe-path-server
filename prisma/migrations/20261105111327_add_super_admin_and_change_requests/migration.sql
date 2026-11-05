-- CreateEnum
CREATE TYPE "AdminChangeRequestType" AS ENUM ('EMAIL', 'PASSWORD');

-- CreateEnum
CREATE TYPE "AdminChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletionRejectedAt" TIMESTAMP(3),
ADD COLUMN     "deletionRejectionReason" TEXT;

-- CreateTable
CREATE TABLE "admin_change_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "type" "AdminChangeRequestType" NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedEmail" TEXT,
    "requestedPasswordHash" TEXT,
    "status" "AdminChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_change_requests_status_idx" ON "admin_change_requests"("status");

-- CreateIndex
CREATE INDEX "admin_change_requests_requesterId_idx" ON "admin_change_requests"("requesterId");

-- CreateIndex
CREATE INDEX "admin_change_requests_targetUserId_idx" ON "admin_change_requests"("targetUserId");

-- AddForeignKey
ALTER TABLE "admin_change_requests" ADD CONSTRAINT "admin_change_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_change_requests" ADD CONSTRAINT "admin_change_requests_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_change_requests" ADD CONSTRAINT "admin_change_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
