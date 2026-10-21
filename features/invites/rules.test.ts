import { describe, expect, it } from "vitest"

import { checkInvite, generateInviteCode, isInviteOnly, isPlausibleCode, maskCode } from "./rules"

const now = new Date("2026-10-21T12:00:00Z")
const base = { maxUses: 1, uses: 0, expiresAt: null, revokedAt: null }

describe("checkInvite", () => {
  it("valido: non scaduto, non revocato, con usi", () => {
    expect(checkInvite(base, now)).toBe("valid")
    expect(checkInvite({ ...base, maxUses: 5, uses: 4, expiresAt: new Date("2026-10-22") }, now)).toBe("valid")
  })

  it("scaduto", () => {
    expect(checkInvite({ ...base, expiresAt: new Date("2026-10-21T11:59:59Z") }, now)).toBe("expired")
    // Scade esattamente adesso: non vale più
    expect(checkInvite({ ...base, expiresAt: now }, now)).toBe("expired")
  })

  it("revocato, anche se ha ancora usi", () => {
    expect(checkInvite({ ...base, maxUses: 10, revokedAt: new Date("2026-10-20") }, now)).toBe("revoked")
  })

  it("esaurito", () => {
    expect(checkInvite({ ...base, uses: 1 }, now)).toBe("exhausted")
    expect(checkInvite({ ...base, maxUses: 3, uses: 3 }, now)).toBe("exhausted")
  })

  it("inesistente", () => {
    expect(checkInvite(null, now)).toBe("missing")
  })
})

describe("generateInviteCode", () => {
  it("256 bit in base64url: 43 caratteri url-safe, sempre diversi", () => {
    const codes = new Set(Array.from({ length: 200 }, generateInviteCode))
    expect(codes.size).toBe(200)
    for (const code of codes) {
      expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(isPlausibleCode(code)).toBe(true)
    }
  })
})

describe("isPlausibleCode", () => {
  it("accetta anche i codici delle campagne (cuid e uuid senza trattini)", () => {
    expect(isPlausibleCode("cmgx1y2z30000abcdefghijkl")).toBe(true)
    expect(isPlausibleCode("0f8c3a9e2b7d4e6f8a1b2c3d4e5f6a7b")).toBe(true)
  })

  it("rifiuta input strani", () => {
    expect(isPlausibleCode("")).toBe(false)
    expect(isPlausibleCode("corto")).toBe(false)
    expect(isPlausibleCode("../../etc/passwd/abcdefgh")).toBe(false)
    expect(isPlausibleCode("a".repeat(65))).toBe(false)
  })
})

describe("maskCode e isInviteOnly", () => {
  it("nei log il codice è troncato", () => {
    const code = generateInviteCode()
    expect(maskCode(code)).toBe(`${code.slice(0, 6)}…`)
    expect(maskCode(code)).not.toContain(code.slice(6))
  })

  it("solo INVITE_ONLY=true attiva la beta", () => {
    expect(isInviteOnly({ INVITE_ONLY: "true" })).toBe(true)
    expect(isInviteOnly({ INVITE_ONLY: "false" })).toBe(false)
    expect(isInviteOnly({ INVITE_ONLY: "1" })).toBe(false)
    expect(isInviteOnly({})).toBe(false)
  })
})
