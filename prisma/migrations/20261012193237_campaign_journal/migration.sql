-- CreateEnum
CREATE TYPE "JournalScope" AS ENUM ('SHARED', 'MASTER');

-- CreateEnum
CREATE TYPE "JournalKind" AS ENUM ('SESSION', 'NPC', 'PLACE', 'NOTE');

-- CreateTable
CREATE TABLE "journal_entry" (
    "id" TEXT NOT NULL,
    "scope" "JournalScope" NOT NULL,
    "kind" "JournalKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "journal_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journal_entry_campaignId_scope_createdAt_idx" ON "journal_entry"("campaignId", "scope", "createdAt");

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
