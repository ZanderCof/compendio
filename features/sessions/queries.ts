import "server-only"

import { prisma } from "@/lib/prisma"

export type SessionState = {
  /** Sessione in corso, se c'è */
  active: { id: string; startedAt: string } | null
  /** Giocatori (non il master) pronti / totali */
  ready: number
  players: number
  /** Se chi guarda ha premuto "Sono pronto" */
  viewerReady: boolean
}

export async function getSessionState(campaignId: string, viewerId: string): Promise<SessionState> {
  const [active, players] = await Promise.all([
    prisma.gameSession.findFirst({
      where: { campaignId, status: "ACTIVE" },
      select: { id: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.membership.findMany({
      where: { campaignId, role: "PLAYER" },
      select: { userId: true, ready: true },
    }),
  ])

  return {
    active: active ? { id: active.id, startedAt: active.startedAt.toISOString() } : null,
    ready: players.filter((p) => p.ready).length,
    players: players.length,
    viewerReady: players.some((p) => p.userId === viewerId && p.ready),
  }
}
