import { beforeEach, describe, expect, it, vi } from "vitest"

// L'azione si chiama direttamente, come farebbe chi salta l'interfaccia: deve controllare da sola chi è admin.
const state = vi.hoisted(() => ({
  email: "admin@example.com",
  updates: [] as { where: { id: string }; data: { status: string; decidedById: string } }[],
}))

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ refresh: () => undefined }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND")
  },
}))
vi.mock("@/lib/session", () => ({ requireUser: async () => ({ id: "u-admin", email: state.email }) }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessRequest: {
      updateMany: async (args: (typeof state.updates)[number]) => {
        state.updates.push(args)
        return { count: args.where.id === "r1" ? 1 : 0 }
      },
    },
  },
}))

const { decideAccessRequest } = await import("./actions")

beforeEach(() => {
  state.updates = []
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
