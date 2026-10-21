import { beforeEach, describe, expect, it, vi } from "vitest"

// L'azione si chiama direttamente, come farebbe chi salta l'interfaccia: deve controllare da sola chi è admin.
const state = vi.hoisted(() => ({
  email: "admin@example.com",
  updates: [] as { where: { id: string }; data: { status: string; decidedById: string } }[],
  users: {} as Record<string, string>,
  deleted: [] as string[],
  deletedCampaigns: [] as string[],
  deletedRequests: [] as string[],
}))

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ refresh: () => undefined }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND")
  },
}))
vi.mock("@/lib/session", () => ({ requireUser: async () => ({ id: "u-admin", email: state.email }) }))
vi.mock("@/lib/prisma", () => {
  const db = {
    accessRequest: {
      updateMany: async (args: (typeof state.updates)[number]) => {
        state.updates.push(args)
        return { count: args.where.id === "r1" ? 1 : 0 }
      },
      deleteMany: async ({ where }: { where: { email: string } }) => {
        state.deletedRequests.push(where.email)
      },
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.users[where.id] ? { email: state.users[where.id] } : null,
      delete: async ({ where }: { where: { id: string } }) => {
        state.deleted.push(where.id)
      },
    },
    campaign: {
      // Il giocatore "u-solo" è l'unico master di "c-solo"
      findMany: async ({ where }: { where: { members: { some: { userId: string } } } }) =>
        where.members.some.userId === "u-solo" ? [{ id: "c-solo" }] : [],
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        state.deletedCampaigns.push(...where.id.in)
      },
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(db),
  }
  return { prisma: db }
})

const { decideAccessRequest, deleteUserProfile } = await import("./actions")

beforeEach(() => {
  state.updates = []
  state.users = { "u-admin": "admin@example.com", "u-solo": "Solo@Example.com", "u-altro": "altro@example.com" }
  state.deleted = []
  state.deletedCampaigns = []
  state.deletedRequests = []
  state.email = "admin@example.com"
  vi.stubEnv("ADMIN_EMAILS", "altro@example.com, Admin@Example.com")
})

describe("decideAccessRequest", () => {
  it("un admin approva e rifiuta", async () => {
    expect(await decideAccessRequest("r1", true)).toBeUndefined()
    expect(await decideAccessRequest("r1", false)).toBeUndefined()
    expect(state.updates.map((u) => u.data.status)).toEqual(["APPROVED", "REJECTED"])
    expect(state.updates[0]?.data.decidedById).toBe("u-admin")
  })

  it("richiesta inesistente: errore", async () => {
    expect(await decideAccessRequest("zzz", true)).toEqual({ error: "Richiesta non trovata" })
  })

  it("chi non è admin non tocca nulla", async () => {
    state.email = "giocatore@example.com"
    await expect(decideAccessRequest("r1", true)).rejects.toThrow("NOT_FOUND")
    expect(state.updates).toHaveLength(0)
  })

  it("senza ADMIN_EMAILS nessuno è admin", async () => {
    vi.stubEnv("ADMIN_EMAILS", "")
    await expect(decideAccessRequest("r1", true)).rejects.toThrow("NOT_FOUND")
  })
})

describe("deleteUserProfile", () => {
  it("elimina il profilo, la sua richiesta di accesso e le campagne in cui era l'unico master", async () => {
    expect(await deleteUserProfile("u-solo")).toBeUndefined()
    expect(state.deleted).toEqual(["u-solo"])
    expect(state.deletedCampaigns).toEqual(["c-solo"])
    expect(state.deletedRequests).toEqual(["solo@example.com"])
  })

  it("non elimina sé stessi né un altro admin", async () => {
    expect(await deleteUserProfile("u-admin")).toEqual({ error: "Non puoi eliminare il tuo profilo da qui" })
    expect(await deleteUserProfile("u-altro")).toEqual({ error: "Non puoi eliminare un altro admin" })
    expect(state.deleted).toHaveLength(0)
  })

  it("utente inesistente: errore", async () => {
    expect(await deleteUserProfile("nessuno")).toEqual({ error: "Utente non trovato" })
  })

  it("chi non è admin non elimina nessuno", async () => {
    state.email = "giocatore@example.com"
    await expect(deleteUserProfile("u-solo")).rejects.toThrow("NOT_FOUND")
    expect(state.deleted).toHaveLength(0)
  })
})
