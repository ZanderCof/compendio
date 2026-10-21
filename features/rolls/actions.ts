"use server"

import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import { format, parse, roll, type RollResult } from "@/features/dice/dice"
import { listSessionFeed, type FeedRoll } from "./queries"

const diceSchema = z.object({
  count: z.number().int(),
  sides: z.number().int(),
  mode: z.enum(["kh", "kl"]).nullable(),
  keep: z.number().int().nullable(),
  modifier: z.number().int().min(-999).max(999),
})

async function membershipOf(campaignId: string, userId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { role: true },
  })
}

/**
 * Tiro fatto dal server in una campagna: nessuno può sceglierne il risultato.
 * Se c'è una sessione in corso finisce nel feed, visibile a tutti (o solo al master se nascosto).
 */
export async function rollInCampaign(
  campaignId: string,
  characterId: string | null,
  label: string,
  dice: unknown,
  hidden: boolean
): Promise<{ ok: true; result: RollResult; logged: boolean } | { ok: false; error: string }> {
  const user = await requireUser()
  const membership = await membershipOf(campaignId, user.id)
  if (!membership) return { ok: false, error: "Non fai parte di questa campagna" }
  if (hidden && membership.role !== "MASTER") return { ok: false, error: "Solo il master può tirare di nascosto" }

  if (characterId) {
    // Per un personaggio tira il suo proprietario, oppure il master della sua campagna
    const character = await prisma.character.findFirst({
      where: { id: characterId, campaignId },
      select: { ownerId: true },
    })
    if (!character || (character.ownerId !== user.id && membership.role !== "MASTER")) {
      return { ok: false, error: "Non puoi tirare per questo personaggio" }
    }
  }

  const parsedDice = diceSchema.safeParse(dice)
  if (!parsedDice.success) return { ok: false, error: "Dadi non validi" }
  let normalized
  try {
    // Ripassa dalla notazione: così valgono gli stessi limiti del parser (max 100 dadi, 1000 facce)
    normalized = parse(format(parsedDice.data))
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Dadi non validi" }
  }

  const result = roll(normalized)
  const session = await prisma.gameSession.findFirst({
    where: { campaignId, status: "ACTIVE" },
    select: { id: true },
  })
  if (session) {
    await prisma.roll.create({
      data: {
        label: z.string().trim().min(1).max(80).catch("Tiro").parse(label),
        notation: result.notation,
        rolls: result.rolls,
        kept: result.kept,
        modifier: result.modifier,
        total: result.total,
        hidden,
        userId: user.id,
        characterId,
        campaignId,
        sessionId: session.id,
      },
    })
  }
  return { ok: true, result, logged: !!session }
}

/** Tiri della sessione in corso (tutti, o solo quelli dopo `afterIso`). Solo per i membri. */
export async function fetchSessionFeed(campaignId: string, afterIso?: string): Promise<FeedRoll[]> {
  const user = await requireUser()
  if (!(await membershipOf(campaignId, user.id))) return []
  const session = await prisma.gameSession.findFirst({
    where: { campaignId, status: "ACTIVE" },
    select: { id: true },
  })
  if (!session) return []
  const after = afterIso ? new Date(afterIso) : undefined
  if (after && Number.isNaN(after.getTime())) return []
  return listSessionFeed(session.id, user.id, after)
}
