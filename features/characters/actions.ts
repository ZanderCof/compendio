"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { canJoinCampaign, MISSION_CAMPAIGN_ERROR } from "@/features/missions/rules"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import { buildSheet, newCharacterSchema, type NewCharacterInput } from "./create"
import { characterSheetSchema } from "./schema"

export type ActionResult = { error: string } | undefined

/** Crea il personaggio e apre la sua scheda. */
export async function createCharacter(input: NewCharacterInput): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = newCharacterSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" }

  const { campaignId, missionsEnabled } = parsed.data
  if (campaignId) {
    const member = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: user.id, campaignId } },
      select: { campaign: { select: { allowMissionCharacters: true } } },
    })
    if (!member) return { error: "Non fai parte di questa campagna" }
    if (!canJoinCampaign(missionsEnabled, member.campaign.allowMissionCharacters)) return { error: MISSION_CAMPAIGN_ERROR }
  }

  const character = await prisma.character.create({
    data: {
      sheet: buildSheet(parsed.data, user.name),
      ownerId: user.id,
      campaignId: campaignId || null,
      missionsEnabled,
    },
    select: { id: true },
  })
  redirect(`/characters/${character.id}`)
}

/** Salva la scheda intera. Solo il proprietario: il master passerà dalle richieste di modifica. */
export async function saveCharacterSheet(
  id: string,
  sheet: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const parsed = characterSheetSchema.safeParse(sheet)
  if (!parsed.success) return { ok: false, error: "Scheda non valida" }

  // updateMany con il filtro sul proprietario: se non è suo, non aggiorna nulla
  const { count } = await prisma.character.updateMany({
    where: { id, ownerId: user.id },
    data: { sheet: parsed.data },
  })
  return count === 1 ? { ok: true } : { ok: false, error: "Non puoi modificare questo personaggio" }
}

/** Sposta il personaggio in una campagna (di cui fai parte) o lo toglie (campaignId null). */
export async function setCharacterCampaign(
  characterId: string,
  campaignId: string | null
): Promise<ActionResult> {
  const user = await requireUser()
  if (campaignId) {
    const [member, character] = await Promise.all([
      prisma.membership.findUnique({
        where: { userId_campaignId: { userId: user.id, campaignId } },
        select: { campaign: { select: { allowMissionCharacters: true } } },
      }),
      prisma.character.findFirst({ where: { id: characterId, ownerId: user.id }, select: { missionsEnabled: true } }),
    ])
    if (!member) return { error: "Non fai parte di questa campagna" }
    if (!character) return { error: "Non puoi modificare questo personaggio" }
    if (!canJoinCampaign(character.missionsEnabled, member.campaign.allowMissionCharacters)) {
      return { error: MISSION_CAMPAIGN_ERROR }
    }
    // Mentre è in missione è lontano: in campagna entra quando torna
    const away = await prisma.missionRun.findFirst({ where: { characterId, status: "ACTIVE" }, select: { id: true } })
    if (away) return { error: "È in missione: potrà entrare in campagna quando torna" }
  }

  const { count } = await prisma.character.updateMany({
    where: { id: characterId, ownerId: user.id },
    data: { campaignId },
  })
  if (count === 0) return { error: "Non puoi modificare questo personaggio" }
  refresh()
}

export async function deleteCharacter(id: string): Promise<ActionResult> {
  const user = await requireUser()
  const { count } = await prisma.character.deleteMany({ where: { id, ownerId: user.id } })
  if (count === 0) return { error: "Non puoi eliminare questo personaggio" }
  redirect("/characters")
}
