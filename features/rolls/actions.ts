"use server"

import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import { format, parse, roll, type RollResult } from "@/features/dice/dice"
import { listCampaignRolls, type RollLogEntry } from "./queries"

const diceSchema = z.object({
  count: z.number().int(),
  sides: z.number().int(),
  mode: z.enum(["kh", "kl"]).nullable(),
  keep: z.number().int().nullable(),
  modifier: z.number().int().min(-999).max(999),
})

/**
 * Tiro fatto sul server per un personaggio in campagna: il risultato finisce nel registro
 * e il giocatore non può sceglierlo. Proprietario o master del personaggio.
 */
export async function rollForCharacter(
  characterId: string,
  label: string,
  dice: unknown
): Promise<{ ok: true; result: RollResult } | { ok: false; error: string }> {
  const user = await requireUser()
  const parsedDice = diceSchema.safeParse(dice)
  if (!parsedDice.success) return { ok: false, error: "Dadi non validi" }

  let normalized
  try {
    // Ripassa dalla notazione: così valgono gli stessi limiti (max 100 dadi, 1000 facce) del parser
    normalized = parse(format(parsedDice.data))
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Dadi non validi" }
  }

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      ownerId: true,
      campaignId: true,
      campaign: { select: { members: { where: { userId: user.id, role: "MASTER" }, select: { id: true } } } },
    },
  })
  const allowed = character && (character.ownerId === user.id || !!character.campaign?.members.length)
  if (!allowed) return { ok: false, error: "Non puoi tirare per questo personaggio" }

  const result = roll(normalized)
  if (character.campaignId) {
    await prisma.roll.create({
      data: {
        label: z.string().trim().min(1).max(80).catch("Tiro").parse(label),
        notation: result.notation,
        rolls: result.rolls,
        kept: result.kept,
        modifier: result.modifier,
        total: result.total,
        userId: user.id,
        characterId,
        campaignId: character.campaignId,
      },
    })
  }
  return { ok: true, result }
}

/** Ultimi tiri della campagna, per il registro che si aggiorna da solo. Solo per i membri. */
export async function fetchCampaignRolls(campaignId: string): Promise<RollLogEntry[]> {
  const user = await requireUser()
  const member = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: user.id, campaignId } },
  })
  if (!member) return []
  return listCampaignRolls(campaignId)
}
