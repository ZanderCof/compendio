import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { handleOAuthUserInfo } from "better-auth/oauth2"
import { runWithEndpointContext } from "@better-auth/core/context"

import { BETA_INVITE_COOKIE, JOIN_INVITE_COOKIE } from "./rules"

// Il flusso vero di Better Auth (handleOAuthUserInfo, lo stesso del callback di Google)
// con un DB in memoria per gli utenti e un Prisma finto per inviti, campagne e inviti via email.
type FakeInvite = { id: string; code: string; maxUses: number; uses: number; expiresAt: Date | null; revokedAt: Date | null }

const fake = vi.hoisted(() => ({
  invites: [] as FakeInvite[],
  campaignCodes: [] as string[],
  pendingEmails: [] as string[],
  requests: [] as { email: string; name: string; status: "PENDING" | "APPROVED" | "REJECTED"; attempts: number }[],
}))

vi.mock("@/lib/prisma", () => {
  const inviteCode = {
    findUnique: async ({ where }: { where: { code: string } }) => fake.invites.find((i) => i.code === where.code) ?? null,
    updateMany: async ({ where }: { where: { id: string; uses: { lt: number } } }) => {
      const invite = fake.invites.find((i) => i.id === where.id)
      const ok =
        invite &&
        !invite.revokedAt &&
        invite.uses < where.uses.lt &&
        (!invite.expiresAt || invite.expiresAt > new Date())
      if (!ok) return { count: 0 }
      invite.uses++
      return { count: 1 }
    },
  }
  const db = {
    inviteCode,
    campaign: {
      findUnique: async ({ where }: { where: { inviteCode: string } }) =>
        fake.campaignCodes.includes(where.inviteCode) ? { id: "camp" } : null,
    },
    invitation: {
      findFirst: async ({ where }: { where: { email: string } }) =>
        fake.pendingEmails.includes(where.email) ? { id: "inv" } : null,
    },
    accessRequest: {
      findFirst: async ({ where }: { where: { email: string; status: string } }) =>
        fake.requests.find((r) => r.email === where.email && r.status === where.status) ?? null,
      upsert: async ({ where, create }: { where: { email: string }; create: { email: string; name: string } }) => {
        const existing = fake.requests.find((r) => r.email === where.email)
        if (existing) existing.attempts++
        else fake.requests.push({ email: create.email, name: create.name, status: "PENDING", attempts: 1 })
      },
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(db),
  }
  return { prisma: db }
})

const { beforeUserCreate } = await import("./signupHook")

const BETA = "B".repeat(43)
const JOIN = "cmgx1y2z30000abcdefghijkl"

function makeAuth() {
  return betterAuth({
    secret: "segreto-di-test-lungo-almeno-32-caratteri!",
    baseURL: "http://localhost:3000",
    database: memoryAdapter({ user: [], account: [], session: [], verification: [] }),
    socialProviders: { google: { clientId: "id", clientSecret: "secret" } },
    user: {
      additionalFields: {
        inviteCodeId: { type: "string", required: false, input: false },
        joinedVia: { type: "string", required: false, input: false },
      },
    },
    databaseHooks: { user: { create: { before: (user, ctx) => beforeUserCreate(user, ctx ?? null) } } },
    logger: { disabled: true },
  })
}

/** Accesso con Google come nel callback: utente con quell'email e i cookie indicati. */
async function googleSignIn(auth: ReturnType<typeof makeAuth>, email: string, cookies: Record<string, string> = {}) {
  const jar = { ...cookies }
  const context = await auth.$context
  const c = {
    context,
    request: undefined,
    headers: new Headers(),
    getCookie: (key: string) => jar[key] ?? null,
    setCookie: (key: string, value: string, options?: { maxAge?: number }) => {
      if (options?.maxAge === 0) delete jar[key]
      else jar[key] = value
      return value
    },
  }
  const result = await runWithEndpointContext(c as never, () =>
    handleOAuthUserInfo(c as never, {
      userInfo: { id: `google-${email}`, email, name: email.split("@")[0] ?? "", emailVerified: true },
      account: { providerId: "google", accountId: `google-${email}` },
      callbackURL: "/",
    })
  ).catch((error: { body?: { code?: string } }) => ({ error: error.body?.code ?? "errore", data: null }))
  const users = await context.internalAdapter.listUsers()
  return { result, users, jar }
}

beforeEach(() => {
  fake.invites = [{ id: "inv1", code: BETA, maxUses: 1, uses: 0, expiresAt: null, revokedAt: null }]
  fake.campaignCodes = [JOIN]
  fake.pendingEmails = []
  fake.requests = []
  vi.stubEnv("INVITE_ONLY", "true")
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("registrazione su invito (INVITE_ONLY=true)", () => {
  it("nuovo utente senza codice: bloccato, nessun utente creato", async () => {
    const auth = makeAuth()
    const { result, users } = await googleSignIn(auth, "nuovo@example.com")
    expect(result.error).toBe("invite_required")
    expect(users).toHaveLength(0)
  })

  it("nuovo utente con codice valido: entra, il codice è consumato e collegato, il cookie sparisce", async () => {
    const auth = makeAuth()
    const { result, users, jar } = await googleSignIn(auth, "nuovo@example.com", { [BETA_INVITE_COOKIE]: BETA })
    expect(result.error).toBeFalsy()
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({ email: "nuovo@example.com", inviteCodeId: "inv1", joinedVia: "beta" })
    expect(fake.invites[0]?.uses).toBe(1)
    expect(jar[BETA_INVITE_COOKIE]).toBeUndefined()
  })

  it("codice esaurito: bloccato", async () => {
    fake.invites[0]!.uses = 1
    const { result, users } = await googleSignIn(makeAuth(), "nuovo@example.com", { [BETA_INVITE_COOKIE]: BETA })
    expect(result.error).toBe("invite_required")
    expect(users).toHaveLength(0)
  })

  it("codice revocato o scaduto: bloccato", async () => {
    fake.invites[0]!.revokedAt = new Date()
    expect((await googleSignIn(makeAuth(), "a@example.com", { [BETA_INVITE_COOKIE]: BETA })).users).toHaveLength(0)
    fake.invites[0]!.revokedAt = null
    fake.invites[0]!.expiresAt = new Date(Date.now() - 1000)
    expect((await googleSignIn(makeAuth(), "b@example.com", { [BETA_INVITE_COOKIE]: BETA })).users).toHaveLength(0)
  })

  it("utente già registrato senza codice: entra sempre", async () => {
    const auth = makeAuth()
    await googleSignIn(auth, "vecchio@example.com", { [BETA_INVITE_COOKIE]: BETA })
    // Secondo accesso: niente cookie, il codice ormai è esaurito
    const { result, users } = await googleSignIn(auth, "vecchio@example.com")
    expect(result.error).toBeFalsy()
    expect(users).toHaveLength(1)
    expect(fake.invites[0]?.uses).toBe(1)
  })

  it("link di una campagna (/join) vale come invito", async () => {
    const { result, users } = await googleSignIn(makeAuth(), "amico@example.com", { [JOIN_INVITE_COOKIE]: JOIN })
    expect(result.error).toBeFalsy()
    expect(users).toHaveLength(1)
  })

  it("link di una campagna inesistente: bloccato", async () => {
    const { users } = await googleSignIn(makeAuth(), "amico@example.com", { [JOIN_INVITE_COOKIE]: "x".repeat(25) })
    expect(users).toHaveLength(0)
  })

  it("email invitata a una campagna vale come invito", async () => {
    fake.pendingEmails = ["invitato@example.com"]
    const { result, users } = await googleSignIn(makeAuth(), "Invitato@Example.com")
    expect(result.error).toBeFalsy()
    expect(users).toHaveLength(1)
  })
})

describe("richieste di accesso", () => {
  it("chi viene bloccato lascia una richiesta, una sola anche se riprova", async () => {
    const auth = makeAuth()
    await googleSignIn(auth, "Curioso@Example.com")
    await googleSignIn(auth, "curioso@example.com")
    expect(fake.requests).toEqual([{ email: "curioso@example.com", name: "Curioso", status: "PENDING", attempts: 2 }])
  })

  it("richiesta approvata: al prossimo accesso entra", async () => {
    fake.requests = [{ email: "ok@example.com", name: "Ok", status: "APPROVED", attempts: 1 }]
    const { result, users } = await googleSignIn(makeAuth(), "ok@example.com")
    expect(result.error).toBeFalsy()
    expect(users[0]).toMatchObject({ email: "ok@example.com", joinedVia: "request" })
  })

  it("richiesta rifiutata: resta bloccato e la richiesta resta rifiutata", async () => {
    fake.requests = [{ email: "no@example.com", name: "No", status: "REJECTED", attempts: 1 }]
    const { result, users } = await googleSignIn(makeAuth(), "no@example.com")
    expect(result.error).toBe("invite_required")
    expect(users).toHaveLength(0)
    expect(fake.requests[0]).toMatchObject({ status: "REJECTED", attempts: 2 })
  })

  it("chi entra con un invito non lascia richieste", async () => {
    await googleSignIn(makeAuth(), "amico@example.com", { [JOIN_INVITE_COOKIE]: JOIN })
    expect(fake.requests).toHaveLength(0)
  })
})

describe("admin", () => {
  it("un'email in ADMIN_EMAILS entra sempre, anche senza inviti (database vuoto)", async () => {
    vi.stubEnv("ADMIN_EMAILS", "capo@example.com")
    const { result, users } = await googleSignIn(makeAuth(), "Capo@Example.com")
    expect(result.error).toBeFalsy()
    expect(users[0]).toMatchObject({ email: "capo@example.com", joinedVia: "admin" })
    expect(fake.requests).toHaveLength(0)
  })
})

describe("INVITE_ONLY spento", () => {
  it.each([["false"], [undefined]])("INVITE_ONLY=%s: registrazione libera come prima, codici intatti", async (value) => {
    if (value === undefined) vi.stubEnv("INVITE_ONLY", undefined)
    else vi.stubEnv("INVITE_ONLY", value)
    const { result, users } = await googleSignIn(makeAuth(), "libero@example.com")
    expect(result.error).toBeFalsy()
    expect(users).toHaveLength(1)
    expect((users[0] as { inviteCodeId?: string | null } | undefined)?.inviteCodeId ?? null).toBeNull()
    expect(fake.invites[0]?.uses).toBe(0)
    expect(fake.requests).toHaveLength(0)
  })
})
