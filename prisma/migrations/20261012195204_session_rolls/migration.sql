-- AlterTable
ALTER TABLE "roll" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "roll_sessionId_createdAt_idx" ON "roll"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "roll" ADD CONSTRAINT "roll_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
