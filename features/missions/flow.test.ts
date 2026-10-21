import { beforeEach, describe, expect, it, vi } from "vitest"

import { buildSheet } from "@/features/characters/create"
import type { CharacterSheet } from "@/features/characters/types"

// Flusso delle missioni con un database finto in memoria: partenza, ritorno, ricompense, banner.
type Run = {
  id: string
  missionId: string
  characterId: string
  userId: string
  weekKey: string
  status: "ACTIVE" | "COMPLETED"
  returnsAt: Date
  natural?: number
  total?: number
  success?: boolean
  xpAwarded?: number
  seenAt: Date | null
  completedAt?: Date
}

const db = vi.hoisted(() => ({
  user: { id: "u1", email: "ale@example.com", xp: 0 },
  isAdmin: false,
  characters: [] as {
    id: string
    ownerId: string
    sheet: unknown
    missionsEnabled: boolean
    campaignId: string | null
  }[],
  missions: [] as Record<string, unknown>[],
  runs: [] as Run[],
  createdMissions: [] as Record<string, unknown>[],
}))

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ refresh: () => undefined }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND")
  },
}))
vi.mock("@/lib/session", () => ({ requireUser: async () => db.user }))
vi.mock("@/lib/admin", () => ({
  requireAdmin: async () => {
    if (!db.isAdmin) throw new Error("NOT_FOUND")
    return db.user
  },
}))
vi.mock("@/lib/prisma", () => {
  const matches = (run: Run, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => {
      if (key === "returnsAt") return run.returnsAt <= (value as { lte: Date }).lte
      if (key === "id" && typeof value === "object" && value) return (value as { in: string[] }).in.includes(run.id)
      return (run as Record<string, unknown>)[key] === value
    })
  const prisma = {
    character: {
      findFirst: async ({ where }: { where: { id: string; ownerId: string } }) =>
        db.characters.find((c) => c.id === where.id && c.ownerId === where.ownerId) ?? null,
      findUnique: async ({ where }: { where: { id: string } }) => db.characters.find((c) => c.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: { sheet: unknown } }) => {
        db.characters.find((c) => c.id === where.id)!.sheet = data.sheet
      },
    },
    mission: {
      findUnique: async ({ where }: { where: { id: string } }) => db.missions.find((m) => m.id === where.id) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        db.createdMissions.push(data)
      },
      findMany: async ({ where }: { where: { tier: string } }) =>
        db.missions.filter((m) => m.tier === where.tier).map((m) => ({ startsAt: m.startsAt })),
    },
    missionRun: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => db.runs.find((r) => matches(r, where)) ?? null,
      create: async ({ data }: { data: Omit<Run, "id" | "status" | "seenAt"> }) => {
        // Vincoli unici come nel database vero
        if (db.runs.some((r) => r.characterId === data.characterId && (r.weekKey === data.weekKey || r.missionId === data.missionId))) {
          throw new Error("P2002")
        }
        db.runs.push({ ...data, id: `run${db.runs.length + 1}`, status: "ACTIVE", seenAt: null })
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        db.runs
          .filter((r) => matches(r, where))
          .map((r) => {
            const mission = db.missions.find((m) => m.id === r.missionId)!
            const character = db.characters.find((c) => c.id === r.characterId)!
            return { ...r, mission, character: { sheet: character.sheet } }
          }),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Run> }) => {
        const hits = db.runs.filter((r) => matches(r, where))
        hits.forEach((r) => Object.assign(r, data))
        return { count: hits.length }
      },
    },
    user: {
      update: async ({ data }: { data: { xp: { increment: number } } }) => {
        db.user.xp += data.xp.increment
      },
      findUnique: async () => ({ xp: db.user.xp }),
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(prisma),
  }
  return { prisma }
})

const { startMission, collectMissionResults, markMissionResultsSeen } = await import("./actions")
const { settleDueRuns } = await import("./settle")
const { createMission } = await import("./admin")

function sheet(overrides: Partial<{ level: number; className: string; race: string }> = {}): CharacterSheet {
  return buildSheet(
    {
      name: "Lyra",
      race: overrides.race ?? "Elfo",
      className: overrides.className ?? "Ranger",
      level: overrides.level ?? 3,
      background: "",
      alignment: "",
      abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
      skills: {},
      speed: 9,
      missionsEnabled: true,
    },
    "Ale"
  )
}

const now = new Date()
const mission = {
  id: "m1",
  title: "Lupi alla fattoria",
  xpReward: 80,
  rewardItem: "Pelle di lupo",
  rewardGold: 25,
  minLevel: 1,
  allowedClasses: [],
  allowedRaces: [],
  startsAt: new Date(now.getTime() - 86_400_000),
  endsAt: new Date(now.getTime() + 86_400_000),
  closedAt: null,
  durationHours: 8,
  ability: "dex",
  dc: 14,
}

beforeEach(() => {
  db.user.xp = 0
  db.isAdmin = false
  db.characters = [{ id: "ch1", ownerId: "u1", sheet: sheet(), missionsEnabled: true, campaignId: null }]
  db.missions = [{ ...mission }, { ...mission, id: "m2", title: "Seconda" }]
  db.runs = []
  db.createdMissions = []
})

describe("startMission", () => {
  it("parte: ritorno dopo la durata della missione", async () => {
    expect(await startMission("ch1", "m1")).toBeUndefined()
    expect(db.runs).toHaveLength(1)
    const away = db.runs[0]!.returnsAt.getTime() - Date.now()
    expect(away).toBeGreaterThan(8 * 3_600_000 - 5000)
    expect(away).toBeLessThanOrEqual(8 * 3_600_000)
  })

  it("rifiuta personaggi altrui, senza missioni o in campagna", async () => {
    expect(await startMission("altro", "m1")).toEqual({ error: "Personaggio non trovato" })
    db.characters[0]!.missionsEnabled = false
    expect((await startMission("ch1", "m1"))?.error).toMatch(/non partecipa/)
    db.characters[0]!.missionsEnabled = true
    db.characters[0]!.campaignId = "c1"
    expect((await startMission("ch1", "m1"))?.error).toMatch(/campagna/)
    expect(db.runs).toHaveLength(0)
  })

  it("rifiuta missioni chiuse, fuori settimana o con requisiti non rispettati", async () => {
    db.missions[0]!.closedAt = new Date()
    expect(await startMission("ch1", "m1")).toEqual({ error: "Questa missione non è disponibile" })
    db.missions[0]!.closedAt = null
    db.missions[0]!.minLevel = 5
    expect(await startMission("ch1", "m1")).toEqual({ error: "Serve almeno il livello 5" })
    db.missions[0]!.minLevel = 1
    db.missions[0]!.allowedRaces = ["Nano"]
    expect(await startMission("ch1", "m1")).toEqual({ error: "Solo per: Nano" })
    expect(db.runs).toHaveLength(0)
  })

  it("una missione alla volta e una a settimana", async () => {
    await startMission("ch1", "m1")
    expect(await startMission("ch1", "m2")).toEqual({ error: "È già in missione" })
    // Anche tornato, la settimana è già "spesa"
    db.runs[0]!.status = "COMPLETED"
    expect((await startMission("ch1", "m2"))?.error).toMatch(/già fatto una missione questa settimana/)
  })
})

describe("ritorno dalla missione", () => {
  function sendAndReturn() {
    db.runs.push({
      id: "run1",
      missionId: "m1",
      characterId: "ch1",
      userId: "u1",
      weekKey: "2026-W43",
      status: "ACTIVE",
      returnsAt: new Date(Date.now() - 1000),
      seenAt: null,
    })
  }

  it("riuscita: tutta l'EXP al profilo, oggetto e oro al personaggio", async () => {
    sendAndReturn()
    // d20 = 12, Destrezza 16 (+3) = 15 contro CD 14
    await settleDueRuns("u1", new Date(), () => 12)
    expect(db.runs[0]).toMatchObject({ status: "COMPLETED", natural: 12, total: 15, success: true, xpAwarded: 80 })
    expect(db.user.xp).toBe(80)
    const after = db.characters[0]!.sheet as CharacterSheet
    expect(after.equipment.at(-1)).toEqual({ name: "Pelle di lupo", quantity: 1 })
    expect(after.currency.gp).toBe(sheet().currency.gp + 25)
  })

  it("fallita: metà EXP e niente bottino", async () => {
    sendAndReturn()
    await settleDueRuns("u1", new Date(), () => 5)
    expect(db.runs[0]).toMatchObject({ success: false, total: 8, xpAwarded: 40 })
    expect(db.user.xp).toBe(40)
    expect((db.characters[0]!.sheet as CharacterSheet).equipment).toEqual(sheet().equipment)
  })

  it("non torna prima del tempo e non si chiude due volte", async () => {
    sendAndReturn()
    db.runs[0]!.returnsAt = new Date(Date.now() + 60_000)
    await settleDueRuns("u1", new Date(), () => 20)
    expect(db.runs[0]!.status).toBe("ACTIVE")
    db.runs[0]!.returnsAt = new Date(Date.now() - 1000)
    await settleDueRuns("u1", new Date(), () => 20)
    await settleDueRuns("u1", new Date(), () => 20)
    expect(db.user.xp).toBe(80)
  })

  it("banner: risultati non visti con livello prima e dopo; poi non tornano più", async () => {
    sendAndReturn()
    db.missions[0]!.xpReward = 120
    const first = await collectMissionResults()
    expect(first.results).toHaveLength(1)
    expect(first.results[0]).toMatchObject({ missionTitle: "Lupi alla fattoria", characterName: "Lyra" })
    expect(first.levelBefore).toBe(1)
    expect(first.levelAfter).toBe(first.results[0]!.success ? 2 : 1)
    await markMissionResultsSeen(first.results.map((r) => r.id))
    expect((await collectMissionResults()).results).toHaveLength(0)
  })
})

describe("createMission (admin)", () => {
  function form(values: Record<string, string | string[]>) {
    const data = new FormData()
    for (const [key, value] of Object.entries(values)) {
      for (const v of Array.isArray(value) ? value : [value]) data.append(key, v)
    }
    return data
  }
  const valid = {
    tier: "SILVER",
    title: "Ronda notturna",
    description: "Pattuglia le mura di Phandalin",
    xpReward: "60",
    rewardItem: "",
    rewardGold: "10",
    minLevel: "2",
    allowedClasses: ["Guerriero", "Paladino"],
    startsOn: "2026-10-19",
    endsOn: "2026-10-25",
    durationHours: "24",
    ability: "con",
    dc: "13",
  }

  it("chi non è admin non crea missioni", async () => {
    await expect(createMission(undefined, form(valid))).rejects.toThrow("NOT_FOUND")
    expect(db.createdMissions).toHaveLength(0)
  })

  it("l'admin crea: settimana in ora italiana, fine dopo l'ultimo giorno, oggetto vuoto = nessuno", async () => {
    db.isAdmin = true
    expect(await createMission(undefined, form(valid))).toEqual({ created: true })
    expect(db.createdMissions[0]).toMatchObject({
      tier: "SILVER",
      title: "Ronda notturna",
      xpReward: 60,
      rewardItem: null,
      rewardGold: 10,
      minLevel: 2,
      allowedClasses: ["Guerriero", "Paladino"],
      allowedRaces: [],
      ability: "con",
      dc: 13,
      startsAt: new Date("2026-10-18T22:00:00Z"),
      endsAt: new Date("2026-10-25T23:00:00Z"),
    })
  })

  it("dati non validi: errore leggibile", async () => {
    db.isAdmin = true
    expect(await createMission(undefined, form({ ...valid, endsOn: "2026-10-01" }))).toEqual({
      error: "La fine deve venire dopo l'inizio",
    })
    expect(await createMission(undefined, form({ ...valid, ability: "fortuna" }))).toHaveProperty("error")
    expect(db.createdMissions).toHaveLength(0)
  })
})

describe("livelli delle missioni (admin)", () => {
  function form(values: Record<string, string>) {
    const data = new FormData()
    for (const [key, value] of Object.entries(values)) data.append(key, value)
    return data
  }
  const base = {
    title: "Missione",
    description: "Descrizione",
    rewardItem: "",
    rewardGold: "",
    xpReward: "",
    minLevel: "",
    durationHours: "",
    dc: "",
    startsOn: "2026-11-02",
    endsOn: "2026-11-08",
    ability: "wis",
  }

  beforeEach(() => {
    db.isAdmin = true
  })

  it("campi vuoti: valori predefiniti del livello", async () => {
    expect(await createMission(undefined, form({ ...base, tier: "GOLD" }))).toEqual({ created: true })
    expect(db.createdMissions[0]).toMatchObject({ tier: "GOLD", xpReward: 100, dc: 14, durationHours: 24, minLevel: 5 })
  })

  it("bronzo facilissimo con EXP e CD scelte dall'admin", async () => {
    await createMission(undefined, form({ ...base, tier: "BRONZE", xpReward: "100", dc: "5" }))
    expect(db.createdMissions[0]).toMatchObject({ tier: "BRONZE", xpReward: 100, dc: 5, durationHours: 4, minLevel: 1 })
  })

  it("niente due diamanti a meno di 30 giorni; più in là va bene", async () => {
    db.missions.push({ ...mission, id: "d1", tier: "DIAMOND", startsAt: new Date("2026-10-20T00:00:00Z") })
    const result = await createMission(undefined, form({ ...base, tier: "DIAMOND" }))
    expect(result?.error).toMatch(/almeno 30 giorni/)
    expect(db.createdMissions).toHaveLength(0)
    expect(
      await createMission(undefined, form({ ...base, tier: "DIAMOND", startsOn: "2026-12-07", endsOn: "2026-12-13" }))
    ).toEqual({ created: true })
    // Gli altri livelli non hanno limiti di frequenza
    expect(await createMission(undefined, form({ ...base, tier: "PLATINUM" }))).toEqual({ created: true })
  })

  it("livello sconosciuto: errore", async () => {
    expect(await createMission(undefined, form({ ...base, tier: "RAME" }))).toHaveProperty("error")
  })
})
