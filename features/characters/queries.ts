import "server-only"

import { prisma } from "@/lib/prisma"
import { listPendingRequests, type EditRequestView } from "@/features/editRequests/queries"
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
  ownerName: string
  campaign: { id: string; name: string } | null
  /** Proposte del master in attesa di risposta */
  pendingRequests: number
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
    ownerName: row.owner.name,
    campaign: row.campaign,
    pendingRequests: row._count.editRequests,
  }
}

const summarySelect = {
  id: true,
  sheet: true,
  owner: { select: { name: true } },
  campaign: { select: { id: true, name: true } },
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
} | null> {
  const row = await prisma.character.findUnique({
    where: { id },
    select: {
      id: true,
      sheet: true,
      ownerId: true,
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
  }
}
