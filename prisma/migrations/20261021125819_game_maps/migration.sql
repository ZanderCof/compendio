-- CreateEnum
CREATE TYPE "DiagonalRule" AS ENUM ('STANDARD', 'ALTERNATE');

-- CreateEnum
CREATE TYPE "TokenSize" AS ENUM ('MEDIUM', 'LARGE', 'HUGE', 'GARGANTUAN');

-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "diagonalRule" "DiagonalRule" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "game_map" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageWidth" INTEGER NOT NULL,
    "imageHeight" INTEGER NOT NULL,
    "cols" INTEGER NOT NULL,
    "rows" INTEGER NOT NULL,
    "cellSize" DOUBLE PRECISION NOT NULL,
    "offsetX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "offsetY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "showGrid" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "showObstacles" BOOLEAN NOT NULL DEFAULT false,
    "turnLock" BOOLEAN NOT NULL DEFAULT true,
    "playersOpenDoors" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "game_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_token" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "imageUrl" TEXT,
    "size" "TokenSize" NOT NULL DEFAULT 'MEDIUM',
    "col" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "hp" INTEGER,
    "maxHp" INTEGER,
    "mapId" TEXT NOT NULL,
    "characterId" TEXT,

    CONSTRAINT "map_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_map_campaignId_active_idx" ON "game_map"("campaignId", "active");

-- CreateIndex
CREATE INDEX "map_token_mapId_idx" ON "map_token"("mapId");

-- AddForeignKey
ALTER TABLE "game_map" ADD CONSTRAINT "game_map_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_token" ADD CONSTRAINT "map_token_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "game_map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_token" ADD CONSTRAINT "map_token_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
