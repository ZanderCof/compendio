import "server-only"

import { prisma } from "@/lib/prisma"
import { listPendingRequests, type EditRequestView } from "@/features/editRequests/queries"
import { abilityModifier } from "./rules"
import { characterSheetSchema } from "./schema"
import type { Character, CharacterSheet } from "./types"

/** Chi sta guardando la scheda: il proprietario la modifica, il master della campagna la vede. */
export type CharacterAccess = "owner" | "master"

export type CharacterSummary = {
  id: string
  name: string
  race: string
  className: string
  level: number
  hitPoints: CharacterSheet["hitPoints"]
  armorClass: number
  /** Modificatore di Destrezza, come nella scheda */
  initiative: number
  ownerName: string
  campaign: { id: string; name: string } | null
  /** Proposte del master in attesa di risposta */
  pendingRequests: number
  /** Può fare le missioni settimanali (scelto alla creazione) */
  missionsEnabled: boolean
}

function parseSheet(id: string, sheet: unknown): CharacterSheet {
  const parsed = characterSheetSchema.safeParse(sheet)
  if (!parsed.success) throw new Error(`Scheda del personaggio ${id} non valida`)
  return parsed.data
}

function toSummary(row: {
  id: string
  sheet: unknown
  owner: { name: string }
  campaign: { id: string; name: string } | null
  missionsEnabled: boolean
  _count: { editRequests: number }
}): CharacterSummary {
  const sheet = parseSheet(row.id, row.sheet)
  return {
    id: row.id,
    name: sheet.name,
    race: sheet.race,
    className: sheet.className,
    level: sheet.level,
    hitPoints: sheet.hitPoints,
    armorClass: sheet.armorClass,
    initiative: abilityModifier(sheet.abilities.dex),
    ownerName: row.owner.name,
    campaign: row.campaign,
    pendingRequests: row._count.editRequests,
    missionsEnabled: row.missionsEnabled,
  }
}

const summarySelect = {
  id: true,
  sheet: true,
  owner: { select: { name: true } },
  campaign: { select: { id: true, name: true } },
  missionsEnabled: true,
  _count: { select: { editRequests: { where: { status: "PENDING" } } } },
} as const

export async function listMyCharacters(userId: string) {
  const rows = await prisma.character.findMany({
    where: { ownerId: userId },
    select: summarySelect,
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(toSummary)
}


/** Scheda completa, solo se chi la chiede ne ha diritto. Altrimenti null (la pagina mostrerà 404). */
export async function getCharacterForViewer(
  id: string,
  userId: string
): Promise<{
  character: Character
  access: CharacterAccess
  requests: EditRequestView[]
  campaignId: string | null
} | null> {
  const row = await prisma.character.findUnique({
    where: { id },
    select: {
      id: true,
      sheet: true,
      ownerId: true,
      campaignId: true,
      campaign: { select: { members: { where: { userId, role: "MASTER" }, select: { id: true } } } },
    },
  })
  if (!row) return null

  const access: CharacterAccess | null =
    row.ownerId === userId ? "owner" : row.campaign?.members.length ? "master" : null
  if (!access) return null

  return {
    character: { ...parseSheet(row.id, row.sheet), id: row.id },
    access,
    requests: await listPendingRequests(row.id),
    campaignId: row.campaignId,
  }
}

/** Il personaggio dell'utente in una campagna (il più recente, se ne ha più di uno). */
export async function getMyCharacterInCampaign(campaignId: string, userId: string) {
  const row = await prisma.character.findFirst({
    where: { campaignId, ownerId: userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  })
  return row ? getCharacterForViewer(row.id, userId) : null
}
