import { beforeEach, describe, expect, it, vi } from "vitest"

// Le azioni si chiamano direttamente, come farebbe un client che salta l'interfaccia.
// Utente e database sono finti: si verificano permessi e regole delle azioni.
type Role = "MASTER" | "PLAYER"
type FakeMap = {
  layout: unknown
  version: number
  playersOpenDoors: boolean
  showObstacles: boolean
  role: Role | null
  cols: number
  rows: number
}

const state = vi.hoisted(() => ({
  map: null as FakeMap | null,
  /** Quante volte un altro utente cambia la mappa proprio mentre si salva */
  concurrentWrites: 0,
  updates: [] as { layout: unknown }[],
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/session", () => ({ requireUser: async () => ({ id: "u1" }) }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    gameMap: {
      // mapForMaster: risponde solo se l'utente è master
      findFirst: async ({ where }: { where: { campaign?: { members?: { some?: { role?: string } } } } }) => {
        const map = state.map
        if (!map || !map.role) return null
        const needsMaster = where.campaign?.members?.some?.role === "MASTER"
        if (needsMaster && map.role !== "MASTER") return null
        return {
          id: "m1",
          campaignId: "c1",
          imageUrl: "/uploads/maps/x.png",
          imageWidth: 500,
          imageHeight: 500,
          layout: map.layout,
          version: map.version,
          playersOpenDoors: map.playersOpenDoors,
          showObstacles: map.showObstacles,
          campaign: { members: [{ role: map.role }] },
        }
      },
      findUniqueOrThrow: async () => ({ cols: state.map!.cols, rows: state.map!.rows }),
      update: async ({ data }: { data: { layout: unknown } }) => {
        state.updates.push({ layout: data.layout })
        state.map!.version++
        return { version: state.map!.version }
      },
      // Aggiornamento condizionato alla versione: simula un altro utente che scrive prima
      updateMany: async ({ where, data }: { where: { version: number }; data: { layout: unknown } }) => {
        if (state.concurrentWrites > 0) {
          state.concurrentWrites--
          state.map!.version++
          return { count: 0 }
        }
        if (where.version !== state.map!.version) return { count: 0 }
        state.updates.push({ layout: data.layout })
        state.map!.layout = data.layout
        state.map!.version++
        return { count: 1 }
      },
    },
  },
}))

const { saveMapLayout, toggleMapDoor } = await import("./actions")

const withDoor = { blocked: [], difficult: [], walls: [], doors: { "v:1:1": false } }

function setMap(partial: Partial<FakeMap>) {
  state.map = {
    layout: withDoor,
    version: 1,
    playersOpenDoors: false,
    showObstacles: false,
    role: "PLAYER",
    cols: 10,
    rows: 10,
    ...partial,
  }
}

describe("toggleMapDoor", () => {
  beforeEach(() => {
    state.updates = []
    state.concurrentWrites = 0
  })

  it("il master apre la porta", async () => {
    setMap({ role: "MASTER" })
    expect(await toggleMapDoor("m1", "v:1:1")).toBeUndefined()
    expect(state.map!.layout).toMatchObject({ doors: { "v:1:1": true } })
  })

  it("un giocatore non può se il master non lo permette", async () => {
    setMap({ role: "PLAYER", playersOpenDoors: false, showObstacles: true })
    expect(await toggleMapDoor("m1", "v:1:1")).toEqual({ error: "Le porte le apre il master" })
    expect(state.updates).toHaveLength(0)
  })

  it("un giocatore non può nemmeno col permesso se gli ostacoli sono nascosti", async () => {
    setMap({ role: "PLAYER", playersOpenDoors: true, showObstacles: false })
    expect(await toggleMapDoor("m1", "v:1:1")).toEqual({ error: "Le porte le apre il master" })
  })

  it("un giocatore col permesso e gli ostacoli visibili la apre", async () => {
    setMap({ role: "PLAYER", playersOpenDoors: true, showObstacles: true })
    expect(await toggleMapDoor("m1", "v:1:1")).toBeUndefined()
  })

  it("chi non è nella campagna non trova la mappa", async () => {
    setMap({ role: null })
    expect(await toggleMapDoor("m1", "v:1:1")).toEqual({ error: "Mappa non trovata" })
  })

  it("su un bordo che non è una porta non succede nulla", async () => {
    setMap({ role: "MASTER" })
    expect(await toggleMapDoor("m1", "h:3:3")).toEqual({ error: "Lì non c'è una porta" })
  })

  it("se qualcuno cambia la mappa nel frattempo, rilegge e riprova", async () => {
    setMap({ role: "MASTER" })
    state.concurrentWrites = 1
    expect(await toggleMapDoor("m1", "v:1:1")).toBeUndefined()
    expect(state.updates).toHaveLength(1)
  })
})

describe("saveMapLayout", () => {
  beforeEach(() => {
    state.updates = []
  })

  it("un giocatore non salva gli ostacoli", async () => {
    setMap({ role: "PLAYER" })
    expect(await saveMapLayout("m1", withDoor)).toEqual({ ok: false, error: "Solo il master modifica la mappa" })
    expect(state.updates).toHaveLength(0)
  })

  it("il master salva, e il server ripulisce quello che esce dalla griglia", async () => {
    setMap({ role: "MASTER", cols: 10, rows: 10 })
    const result = await saveMapLayout("m1", { blocked: [5, 500], difficult: [5, 6], walls: ["v:99:0"], doors: {} })
    expect(result.ok).toBe(true)
    expect(state.updates[0].layout).toEqual({ blocked: [5], difficult: [6], walls: [], doors: {} })
  })

  it("dati malformati vengono rifiutati", async () => {
    setMap({ role: "MASTER" })
    expect(await saveMapLayout("m1", { walls: ["DROP TABLE"] })).toEqual({ ok: false, error: "Ostacoli non validi" })
  })
})
