import "server-only"

import { prisma } from "@/lib/prisma"
import { canDeleteEntry, canEditEntry, type JournalKind, type JournalScope } from "./journal"

export type JournalEntryView = {
  id: string
  kind: JournalKind
  title: string
  body: string
  createdAt: string
  updatedAt: string
  author: { name: string; image: string | null }
  canEdit: boolean
  canDelete: boolean
}

/** Voci di un diario, dalla più recente. Chi chiama deve aver già controllato che possa leggerlo. */
export async function listJournal(
  campaignId: string,
  scope: JournalScope,
  viewer: { userId: string; isMaster: boolean }
): Promise<JournalEntryView[]> {
  const rows = await prisma.journalEntry.findMany({
    where: { campaignId, scope },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      title: true,
      body: true,
      scope: true,
      authorId: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true, image: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: row.author,
    canEdit: canEditEntry(row, viewer),
    canDelete: canDeleteEntry(row, viewer),
  }))
}
