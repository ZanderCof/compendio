-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'ENDED');

-- AlterTable
ALTER TABLE "membership" ADD COLUMN     "ready" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "game_session" (
    "id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "campaignId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,

    CONSTRAINT "game_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_session_campaignId_status_idx" ON "game_session"("campaignId", "status");

-- AddForeignKey
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
