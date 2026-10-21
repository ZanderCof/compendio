-- CreateEnum
CREATE TYPE "MissionTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "tier" "MissionTier" NOT NULL DEFAULT 'BRONZE';
