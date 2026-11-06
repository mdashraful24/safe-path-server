-- AlterTable
ALTER TABLE "contact_messages" ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "repliedById" TEXT,
ADD COLUMN     "reply" TEXT;

-- CreateIndex
CREATE INDEX "contact_messages_repliedById_idx" ON "contact_messages"("repliedById");

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
