import "server-only"

import { prisma } from "@/lib/prisma"

export type ChatMessageView = {
  id: string
  body: string
  createdAt: string
  user: { id: string; name: string; image: string | null }
}

// Quanti messaggi caricare all'apertura della pagina
const HISTORY_LIMIT = 50

const select = {
  id: true,
  body: true,
  createdAt: true,
  user: { select: { id: true, name: true, image: true } },
} as const

const toView = (row: { id: string; body: string; createdAt: Date; user: ChatMessageView["user"] }) => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
})

/** Ultimi messaggi, dal più vecchio al più recente (come si leggono in una chat). */
export async function listRecentMessages(campaignId: string): Promise<ChatMessageView[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { campaignId },
    select,
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  })
  return rows.reverse().map(toView)
}

/** Solo i messaggi arrivati dopo `after`: è quello che chiede la chat ogni pochi secondi. */
export async function listMessagesAfter(campaignId: string, after: Date): Promise<ChatMessageView[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { campaignId, createdAt: { gt: after } },
    select,
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
  })
  return rows.map(toView)
}
