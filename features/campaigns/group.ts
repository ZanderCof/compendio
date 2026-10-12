import "server-only"

import { prisma } from "@/lib/prisma"
import { characterSheetSchema } from "@/features/characters/schema"

/** Online = il sito era aperto negli ultimi 2 minuti (il browser lo segnala ogni minuto). */
export const ONLINE_WINDOW_MS = 2 * 60_000

export type GroupStatus = "online" | "offline" | "pending" | "declined"

export type GroupEntry = {
  key: string
  status: GroupStatus
  /** Nome del giocatore, oppure l'email per chi è stato invitato ma non ha ancora un account */
  playerName: string
  image: string | null
  role: "MASTER" | "PLAYER" | null
  /** Il giocatore ha premuto "Sono pronto" */
  ready: boolean
  userId: string | null
  /** Solo per gli inviti, e solo il master la riceve */
  email: string | null
  invitationId: string | null
  lastSeenAt: string | null
  /** href null = scheda non apribile da chi guarda (personaggio di un altro giocatore) */
  characters: { id: string; name: string; href: string | null }[]
}

const STATUS_ORDER: Record<GroupStatus, number> = { online: 0, offline: 1, pending: 2, declined: 3 }

/**
 * Tutto il gruppo in una lista: membri (online/offline) con i loro personaggi e,
 * per il master, gli inviti in attesa o rifiutati.
 */
export async function getCampaignGroup(campaignId: string, viewerId: string): Promise<GroupEntry[]> {
  const [members, characters, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { campaignId },
      select: {
        role: true,
        ready: true,
        user: { select: { id: true, name: true, image: true, email: true, lastSeenAt: true } },
      },
    }),
    prisma.character.findMany({
      where: { campaignId },
      select: { id: true, sheet: true, ownerId: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { campaignId, status: { in: ["PENDING", "DECLINED"] } },
      select: { id: true, email: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const viewerIsMaster = members.some((m) => m.user.id === viewerId && m.role === "MASTER")
  const now = Date.now()

  const entries: GroupEntry[] = members.map(({ role, ready, user }) => {
    const online = !!user.lastSeenAt && now - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS
    return {
      key: `member-${user.id}`,
      status: online ? "online" : "offline",
      playerName: user.name,
      image: user.image,
      role,
      ready,
      userId: user.id,
      email: null,
      invitationId: null,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      characters: characters
        .filter((c) => c.ownerId === user.id)
        .map((c) => ({
          id: c.id,
          name: characterSheetSchema.shape.name.safeParse((c.sheet as { name?: unknown })?.name).data ?? "Senza nome",
          // La scheda la apre il proprietario o il master
          href: viewerIsMaster || c.ownerId === viewerId ? `/characters/${c.id}` : null,
        })),
    }
  })

  if (viewerIsMaster) {
    // Se l'invitato ha già un account, si mostra il suo nome invece dell'email
    const memberEmails = new Set(members.map((m) => m.user.email.toLowerCase()))
    const accounts = await prisma.user.findMany({
      where: { email: { in: invitations.map((i) => i.email), mode: "insensitive" } },
      select: { email: true, name: true, image: true },
    })
    for (const invitation of invitations) {
      if (memberEmails.has(invitation.email)) continue
      const account = accounts.find((a) => a.email.toLowerCase() === invitation.email)
      entries.push({
        key: `invitation-${invitation.id}`,
        status: invitation.status === "PENDING" ? "pending" : "declined",
        playerName: account?.name ?? invitation.email,
        image: account?.image ?? null,
        role: null,
        ready: false,
        userId: null,
        email: invitation.email,
        invitationId: invitation.id,
        lastSeenAt: null,
        characters: [],
      })
    }
  }

  return entries.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      // Il master in cima al suo gruppo di stato
      Number(b.role === "MASTER") - Number(a.role === "MASTER") ||
      a.playerName.localeCompare(b.playerName, "it")
  )
}
