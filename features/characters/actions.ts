"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

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

  const { campaignId } = parsed.data
  if (campaignId) {
    const member = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: user.id, campaignId } },
    })
    if (!member) return { error: "Non fai parte di questa campagna" }
  }

  const character = await prisma.character.create({
    data: {
      sheet: buildSheet(parsed.data, user.name),
      ownerId: user.id,
      campaignId: campaignId || null,
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
    const member = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: user.id, campaignId } },
    })
    if (!member) return { error: "Non fai parte di questa campagna" }
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
