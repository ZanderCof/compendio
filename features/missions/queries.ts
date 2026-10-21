import "server-only"

import { characterSheetSchema } from "@/features/characters/schema"
import { prisma } from "@/lib/prisma"
import { eligibilityProblem, weekKey } from "./engine"
import { settleDueRuns } from "./settle"
import { tierRank, type MissionTier } from "./tiers"

export type BoardMission = {
  id: string
  tier: MissionTier
  title: string
  description: string
  xpReward: number
  rewardItem: string | null
  rewardGold: number
  minLevel: number
  allowedClasses: string[]
  allowedRaces: string[]
  durationHours: number
  ability: string
  dc: number
  endsAt: string
  /** Per ogni personaggio abilitato: null se può partire, altrimenti il motivo */
  candidates: { characterId: string; problem: string | null }[]
}

export type BoardCharacter = {
  id: string
  name: string
  className: string
  campaignName: string | null
  /** In missione adesso: titolo e ritorno */
  away: { missionTitle: string; returnsAt: string } | null
  /** Ha già fatto la missione di questa settimana */
  doneThisWeek: boolean
}

/**
 * Bacheca del profilo: missioni aperte e personaggi abilitati, con chi può partire per cosa.
 * Prima chiude le missioni già finite, così lo stato è aggiornato.
 */
export async function getMissionBoard(userId: string, now = new Date()) {
  await settleDueRuns(userId, now)
  const week = weekKey(now)

  const [missions, characters] = await Promise.all([
    prisma.mission.findMany({
      where: { closedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { endsAt: "asc" },
    }),
    prisma.character.findMany({
      where: { ownerId: userId, missionsEnabled: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        sheet: true,
        campaign: { select: { name: true } },
        missionRuns: {
          select: { missionId: true, weekKey: true, status: true, returnsAt: true, mission: { select: { title: true } } },
        },
      },
    }),
  ])

  const parsed = characters.flatMap((c) => {
    const sheet = characterSheetSchema.safeParse(c.sheet)
    return sheet.success ? [{ ...c, sheet: sheet.data }] : []
  })

  const boardCharacters: BoardCharacter[] = parsed.map((c) => {
    const active = c.missionRuns.find((r) => r.status === "ACTIVE")
    return {
      id: c.id,
      name: c.sheet.name,
      className: c.sheet.className,
      campaignName: c.campaign?.name ?? null,
      away: active ? { missionTitle: active.mission.title, returnsAt: active.returnsAt.toISOString() } : null,
      doneThisWeek: c.missionRuns.some((r) => r.weekKey === week),
    }
  })

  // Prima le più preziose (diamante in cima), poi quelle che scadono prima
  const sorted = missions.toSorted((a, b) => tierRank(b.tier) - tierRank(a.tier))
  const boardMissions: BoardMission[] = sorted.map((m) => ({
    id: m.id,
    tier: m.tier,
    title: m.title,
    description: m.description,
    xpReward: m.xpReward,
    rewardItem: m.rewardItem,
    rewardGold: m.rewardGold,
    minLevel: m.minLevel,
    allowedClasses: m.allowedClasses,
    allowedRaces: m.allowedRaces,
    durationHours: m.durationHours,
    ability: m.ability,
    dc: m.dc,
    endsAt: m.endsAt.toISOString(),
    candidates: parsed.map((c) => {
      const board = boardCharacters.find((b) => b.id === c.id)!
      let problem: string | null = null
      if (c.campaign) problem = "È in campagna"
      else if (board.away) problem = "È già in missione"
      else if (board.doneThisWeek) problem = "Ha già fatto la missione della settimana"
      else if (c.missionRuns.some((r) => r.missionId === m.id)) problem = "L'ha già fatta"
      else problem = eligibilityProblem(m, c.sheet)
      return { characterId: c.id, problem }
    }),
  }))

  return { missions: boardMissions, characters: boardCharacters }
}

/** Tutte le missioni con quante volte sono state fatte. Solo per la pagina admin. */
export async function listMissionsForAdmin() {
  const missions = await prisma.mission.findMany({
    orderBy: { startsAt: "desc" },
    take: 100,
    include: {
      createdBy: { select: { name: true } },
      runs: { select: { status: true, success: true } },
    },
  })
  return missions.map(({ runs, ...m }) => ({
    ...m,
    runsTotal: runs.length,
    runsActive: runs.filter((r) => r.status === "ACTIVE").length,
    runsSucceeded: runs.filter((r) => r.success === true).length,
  }))
}
