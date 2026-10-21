import { beforeEach, describe, expect, it, vi } from "vitest"

// Le azioni si chiamano direttamente, come farebbe chi salta l'interfaccia:
// la regola del master sulle missioni deve valere anche lato server.
const state = vi.hoisted(() => ({
  allowMissionCharacters: true,
  missionsEnabled: true,
  isMember: true,
  isMaster: true,
  missionCharactersInside: 0,
  onMission: false,
  moved: [] as (string | null)[],
  ruleUpdates: [] as boolean[],
  created: [] as { missionsEnabled: boolean; campaignId: string | null }[],
}))

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ refresh: () => undefined }))
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("REDIRECT")
  },
}))
vi.mock("@/lib/session", () => ({ requireUser: async () => ({ id: "u1", name: "Ale", email: "a@example.com" }) }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findUnique: async () =>
        state.isMember ? { campaign: { allowMissionCharacters: state.allowMissionCharacters } } : null,
      findFirst: async () => (state.isMaster ? { id: "m1" } : null),
    },
    character: {
      findFirst: async () => ({ missionsEnabled: state.missionsEnabled }),
      updateMany: async ({ data }: { data: { campaignId: string | null } }) => {
        state.moved.push(data.campaignId)
        return { count: 1 }
      },
      create: async ({ data }: { data: { missionsEnabled: boolean; campaignId: string | null } }) => {
        state.created.push({ missionsEnabled: data.missionsEnabled, campaignId: data.campaignId })
        return { id: "new" }
      },
      count: async () => state.missionCharactersInside,
    },
    missionRun: {
      findFirst: async () => (state.onMission ? { id: "run1" } : null),
    },
    campaign: {
      update: async ({ data }: { data: { allowMissionCharacters: boolean } }) => {
        state.ruleUpdates.push(data.allowMissionCharacters)
      },
    },
  },
}))

const { createCharacter, setCharacterCampaign } = await import("@/features/characters/actions")
const { setAllowMissionCharacters } = await import("@/features/campaigns/actions")
const { MISSION_CAMPAIGN_ERROR } = await import("./rules")

const newCharacter = {
  name: "Brakka",
  race: "Nano",
  className: "Guerriero",
  level: 1,
  abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 10 },
  campaignId: "c1",
}

beforeEach(() => {
  Object.assign(state, {
    allowMissionCharacters: true,
    missionsEnabled: true,
    isMember: true,
    isMaster: true,
    missionCharactersInside: 0,
    onMission: false,
    moved: [],
    ruleUpdates: [],
    created: [],
  })
})

describe("personaggi con le missioni e campagne", () => {
  it("non entra in una campagna che non li ammette", async () => {
    state.allowMissionCharacters = false
    expect(await setCharacterCampaign("ch1", "c1")).toEqual({ error: MISSION_CAMPAIGN_ERROR })
    expect(state.moved).toHaveLength(0)
  })

  it("entra se la campagna li ammette; uno normale entra ovunque", async () => {
    expect(await setCharacterCampaign("ch1", "c1")).toBeUndefined()
    state.allowMissionCharacters = false
    state.missionsEnabled = false
    expect(await setCharacterCampaign("ch1", "c1")).toBeUndefined()
    expect(state.moved).toEqual(["c1", "c1"])
  })

  it("mentre è in missione non entra in nessuna campagna", async () => {
    state.onMission = true
    expect(await setCharacterCampaign("ch1", "c1")).toEqual({
      error: "È in missione: potrà entrare in campagna quando torna",
    })
    expect(state.moved).toHaveLength(0)
  })

  it("togliere un personaggio dalla campagna è sempre possibile", async () => {
    state.allowMissionCharacters = false
    expect(await setCharacterCampaign("ch1", null)).toBeUndefined()
    expect(state.moved).toEqual([null])
  })

  it("creazione: con missioni in una campagna chiusa viene rifiutato, senza missioni passa", async () => {
    state.allowMissionCharacters = false
    expect(await createCharacter({ ...newCharacter, missionsEnabled: true })).toEqual({ error: MISSION_CAMPAIGN_ERROR })
    expect(state.created).toHaveLength(0)
    await expect(createCharacter({ ...newCharacter, missionsEnabled: false })).rejects.toThrow("REDIRECT")
    expect(state.created).toEqual([{ missionsEnabled: false, campaignId: "c1" }])
  })

  it("la spunta finisce sul personaggio; senza indicarla è un personaggio normale", async () => {
    await expect(createCharacter({ ...newCharacter, missionsEnabled: true })).rejects.toThrow("REDIRECT")
    await expect(createCharacter(newCharacter)).rejects.toThrow("REDIRECT")
    expect(state.created.map((c) => c.missionsEnabled)).toEqual([true, false])
  })
})

describe("setAllowMissionCharacters", () => {
  it("solo il master cambia la regola", async () => {
    state.isMaster = false
    expect(await setAllowMissionCharacters("c1", false)).toEqual({ error: "Solo il master può cambiare questa regola" })
    expect(state.ruleUpdates).toHaveLength(0)
  })

  it("non si chiude se dentro ci sono già personaggi con le missioni", async () => {
    state.missionCharactersInside = 2
    const result = await setAllowMissionCharacters("c1", false)
    expect(result?.error).toMatch(/2 personaggi/)
    expect(state.ruleUpdates).toHaveLength(0)
  })

  it("si apre e si chiude quando è possibile", async () => {
    expect(await setAllowMissionCharacters("c1", false)).toBeUndefined()
    state.missionCharactersInside = 3
    // Riaprire va sempre bene
    expect(await setAllowMissionCharacters("c1", true)).toBeUndefined()
    expect(state.ruleUpdates).toEqual([false, true])
  })
})
