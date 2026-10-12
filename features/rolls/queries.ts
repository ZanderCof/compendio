import "server-only"

import { prisma } from "@/lib/prisma"
import { characterSheetSchema } from "@/features/characters/schema"
import { naturalD20 } from "@/features/dice/dice"

export type RollLogEntry = {
  id: string
  label: string
  notation: string
  rolls: number[]
  kept: number[]
  modifier: number
  total: number
  createdAt: string
  /** Valore del d20 tenuto, per evidenziare 20 e 1 naturali */
  natural: number | null
  userName: string
  characterName: string | null
}

const LOG_LIMIT = 30

export async function listCampaignRolls(campaignId: string): Promise<RollLogEntry[]> {
  const rows = await prisma.roll.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    take: LOG_LIMIT,
    select: {
      id: true,
      label: true,
      notation: true,
      rolls: true,
      kept: true,
      modifier: true,
      total: true,
      createdAt: true,
      user: { select: { name: true } },
      character: { select: { sheet: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    notation: row.notation,
    rolls: row.rolls,
    kept: row.kept,
    modifier: row.modifier,
    total: row.total,
    createdAt: row.createdAt.toISOString(),
    natural: naturalD20(row.notation, row.kept),
    userName: row.user.name,
    characterName: row.character
      ? (characterSheetSchema.shape.name.safeParse((row.character.sheet as { name?: unknown })?.name).data ?? null)
      : null,
  }))
}
