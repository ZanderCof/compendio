-- CreateEnum
CREATE TYPE "PollStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('YES', 'MAYBE', 'NO');

-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "nextSessionAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "date_poll" (
    "id" TEXT NOT NULL,
    "status" "PollStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "campaignId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "date_poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "date_option" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "pollId" TEXT NOT NULL,

    CONSTRAINT "date_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "date_vote" (
    "id" TEXT NOT NULL,
    "answer" "Availability" NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "date_vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "date_poll_campaignId_status_idx" ON "date_poll"("campaignId", "status");

-- CreateIndex
CREATE INDEX "date_option_pollId_idx" ON "date_option"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "date_vote_optionId_userId_key" ON "date_vote"("optionId", "userId");

-- AddForeignKey
ALTER TABLE "date_poll" ADD CONSTRAINT "date_poll_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_poll" ADD CONSTRAINT "date_poll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_option" ADD CONSTRAINT "date_option_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "date_poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_vote" ADD CONSTRAINT "date_vote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "date_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_vote" ADD CONSTRAINT "date_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
