import "server-only"

import { prisma } from "@/lib/prisma"
import { characterSheetSchema } from "@/features/characters/schema"
import { naturalD20 } from "@/features/dice/dice"

export type FeedRoll = {
  id: string
  label: string
  notation: string
  rolls: number[]
  kept: number[]
  modifier: number
  total: number
  hidden: boolean
  createdAt: string
  /** Valore del d20 tenuto, per evidenziare 20 e 1 naturali */
  natural: number | null
  user: { id: string; name: string }
  characterName: string | null
}

// Quanti tiri mostrare quando si apre la pagina
const FEED_LIMIT = 40

/** Tiri della sessione visibili a chi guarda: i tiri nascosti li vede solo chi li ha fatti. */
export async function listSessionFeed(sessionId: string, viewerId: string, after?: Date): Promise<FeedRoll[]> {
  const rows = await prisma.roll.findMany({
    where: {
      sessionId,
      OR: [{ hidden: false }, { userId: viewerId }],
      ...(after ? { createdAt: { gt: after } } : {}),
    },
    orderBy: { createdAt: after ? "asc" : "desc" },
    take: FEED_LIMIT,
    select: {
      id: true,
      label: true,
      notation: true,
      rolls: true,
      kept: true,
      modifier: true,
      total: true,
      hidden: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
      character: { select: { sheet: true } },
    },
  })

  const feed = rows.map((row) => ({
    id: row.id,
    label: row.label,
    notation: row.notation,
    rolls: row.rolls,
    kept: row.kept,
    modifier: row.modifier,
    total: row.total,
    hidden: row.hidden,
    createdAt: row.createdAt.toISOString(),
    natural: naturalD20(row.notation, row.kept),
    user: row.user,
    characterName: row.character
      ? (characterSheetSchema.shape.name.safeParse((row.character.sheet as { name?: unknown })?.name).data ?? null)
      : null,
  }))
  // Sempre dal più vecchio al più recente, come si legge un feed
  return after ? feed : feed.reverse()
}
