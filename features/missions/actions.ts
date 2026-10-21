"use server"

import { refresh } from "next/cache"

import { characterSheetSchema } from "@/features/characters/schema"
import { levelForXp } from "@/features/profile/xp"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import { eligibilityProblem, isMissionOpen, weekKey } from "./engine"
import { settleDueRuns } from "./settle"
import type { MissionTier } from "./tiers"

export type MissionActionState = { error?: string } | undefined

/**
 * Manda un personaggio in missione. Controlli lato server: è tuo, ha le missioni abilitate, è a casa
 * (senza campagna e non già in missione), la missione è aperta, rispetta i requisiti, non ha già fatto
 * una missione questa settimana e non ha già fatto questa.
 */
export async function startMission(characterId: string, missionId: string): Promise<MissionActionState> {
  const user = await requireUser()
  const now = new Date()

  const [character, mission] = await Promise.all([
    prisma.character.findFirst({
      where: { id: characterId, ownerId: user.id },
      select: { sheet: true, missionsEnabled: true, campaignId: true },
    }),
    prisma.mission.findUnique({ where: { id: missionId } }),
  ])
  if (!character) return { error: "Personaggio non trovato" }
  if (!character.missionsEnabled) return { error: "Questo personaggio non partecipa alle missioni" }
  if (character.campaignId) return { error: "È in una campagna: le missioni aspettano che torni a casa" }
  if (!mission || !isMissionOpen(mission, now)) return { error: "Questa missione non è disponibile" }

  const sheet = characterSheetSchema.safeParse(character.sheet)
  if (!sheet.success) return { error: "Scheda del personaggio non valida" }
  const problem = eligibilityProblem(mission, sheet.data)
  if (problem) return { error: problem }

  const busy = await prisma.missionRun.findFirst({ where: { characterId, status: "ACTIVE" }, select: { id: true } })
  if (busy) return { error: "È già in missione" }

  try {
    await prisma.missionRun.create({
      data: {
        missionId,
        characterId,
        userId: user.id,
        weekKey: weekKey(now),
        startedAt: now,
        returnsAt: new Date(now.getTime() + mission.durationHours * 3_600_000),
      },
    })
  } catch {
    // Vincoli unici del database: una missione a settimana, e ogni missione una volta sola
    return { error: "Questo personaggio ha già fatto una missione questa settimana (o questa missione)" }
  }
  refresh()
}

export type MissionResult = {
  id: string
  tier: MissionTier
  missionTitle: string
  characterName: string
  success: boolean
  natural: number
  total: number
  dc: number
  xpAwarded: number
  rewardItem: string | null
  rewardGold: number
}

/**
 * Chiamata dal browser all'apertura del sito e ogni tanto: chiude le missioni finite e restituisce
 * i risultati non ancora visti (per i banner), più il livello prima e dopo per il "level up".
 */
export async function collectMissionResults(): Promise<{
  results: MissionResult[]
  levelBefore: number
  levelAfter: number
}> {
  const user = await requireUser()
  await settleDueRuns(user.id)

  const [runs, profile] = await Promise.all([
    prisma.missionRun.findMany({
      where: { userId: user.id, status: "COMPLETED", seenAt: null },
      orderBy: { completedAt: "asc" },
      select: {
        id: true,
        success: true,
        natural: true,
        total: true,
        xpAwarded: true,
        character: { select: { sheet: true } },
        mission: { select: { tier: true, title: true, dc: true, rewardItem: true, rewardGold: true } },
      },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { xp: true } }),
  ])

  const results = runs.map((run) => {
    const sheet = characterSheetSchema.safeParse(run.character.sheet)
    const success = run.success ?? false
    return {
      id: run.id,
      tier: run.mission.tier,
      missionTitle: run.mission.title,
      characterName: sheet.success ? sheet.data.name : "Il tuo personaggio",
      success,
      natural: run.natural ?? 0,
      total: run.total ?? 0,
      dc: run.mission.dc,
      xpAwarded: run.xpAwarded ?? 0,
      // Le ricompense del personaggio arrivano solo con la prova riuscita
      rewardItem: success ? run.mission.rewardItem : null,
      rewardGold: success ? run.mission.rewardGold : 0,
    }
  })

  const xp = profile?.xp ?? 0
  const gained = results.reduce((sum, r) => sum + r.xpAwarded, 0)
  return { results, levelBefore: levelForXp(xp - gained), levelAfter: levelForXp(xp) }
}

/** Il giocatore ha chiuso i banner: non si mostrano più. */
export async function markMissionResultsSeen(ids: string[]) {
  const user = await requireUser()
  await prisma.missionRun.updateMany({
    where: { id: { in: ids.slice(0, 50) }, userId: user.id, seenAt: null },
    data: { seenAt: new Date() },
  })
  refresh()
}
