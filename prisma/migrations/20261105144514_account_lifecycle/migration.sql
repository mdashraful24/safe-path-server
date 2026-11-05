-- CreateEnum
CREATE TYPE "AccountLifecycleEventType" AS ENUM ('DELETION_REQUESTED', 'DELETION_APPROVED', 'DELETION_REJECTED', 'RESTORE_REQUESTED', 'RESTORED', 'PURGED');

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PURGED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletionApprovedAt" TIMESTAMP(3),
ADD COLUMN     "purgeAfter" TIMESTAMP(3),
ADD COLUMN     "purgedAt" TIMESTAMP(3),
ADD COLUMN     "restoreDeadline" TIMESTAMP(3),
ADD COLUMN     "restoredAt" TIMESTAMP(3);

-- Backfill lifecycle dates for accounts deleted before this migration.
UPDATE "users"
SET
    "deletionApprovedAt" = COALESCE("deletionApprovedAt", "deletedAt"),
    "restoreDeadline" = COALESCE("restoreDeadline", "deletedAt" + INTERVAL '30 days'),
    "purgeAfter" = COALESCE("purgeAfter", "deletedAt" + INTERVAL '90 days')
WHERE "status" = 'DELETED'
  AND "deletedAt" IS NOT NULL;

-- CreateTable
CREATE TABLE "account_lifecycle_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "AccountLifecycleEventType" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_lifecycle_events_userId_createdAt_idx" ON "account_lifecycle_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "account_lifecycle_events_actorId_idx" ON "account_lifecycle_events"("actorId");

-- CreateIndex
CREATE INDEX "account_lifecycle_events_type_createdAt_idx" ON "account_lifecycle_events"("type", "createdAt");

-- CreateIndex
CREATE INDEX "users_status_purgeAfter_idx" ON "users"("status", "purgeAfter");

-- CreateIndex
CREATE INDEX "users_restoreDeadline_idx" ON "users"("restoreDeadline");

-- CreateIndex
CREATE INDEX "users_purgeAfter_idx" ON "users"("purgeAfter");

-- AddForeignKey
ALTER TABLE "account_lifecycle_events" ADD CONSTRAINT "account_lifecycle_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_lifecycle_events" ADD CONSTRAINT "account_lifecycle_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
