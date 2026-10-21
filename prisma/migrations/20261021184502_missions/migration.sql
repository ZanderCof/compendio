-- CreateEnum
CREATE TYPE "MissionRunStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "rewardItem" TEXT,
    "rewardGold" INTEGER NOT NULL DEFAULT 0,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "allowedClasses" TEXT[],
    "allowedRaces" TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "ability" TEXT NOT NULL,
    "dc" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionRun" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "status" "MissionRunStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnsAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "natural" INTEGER,
    "total" INTEGER,
    "success" BOOLEAN,
    "xpAwarded" INTEGER,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "MissionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mission_startsAt_endsAt_idx" ON "Mission"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "MissionRun_userId_status_idx" ON "MissionRun"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MissionRun_characterId_weekKey_key" ON "MissionRun"("characterId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "MissionRun_characterId_missionId_key" ON "MissionRun"("characterId", "missionId");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRun" ADD CONSTRAINT "MissionRun_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRun" ADD CONSTRAINT "MissionRun_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRun" ADD CONSTRAINT "MissionRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
