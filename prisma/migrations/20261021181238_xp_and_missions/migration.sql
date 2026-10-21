-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "allowMissionCharacters" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "character" ADD COLUMN     "missionsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;
