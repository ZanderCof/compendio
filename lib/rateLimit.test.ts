import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { clientIp, rateLimit } = await import("./rateLimit")

describe("rateLimit", () => {
  it("blocca oltre il limite e riparte con la finestra successiva", () => {
    const t = 1_000_000
    for (let i = 0; i < 20; i++) expect(rateLimit("ip-a", 20, 60_000, t + i)).toBe(true)
    expect(rateLimit("ip-a", 20, 60_000, t + 100)).toBe(false)
    // Un altro IP non è toccato
    expect(rateLimit("ip-b", 20, 60_000, t + 100)).toBe(true)
    // Dopo un minuto si riparte
    expect(rateLimit("ip-a", 20, 60_000, t + 60_001)).toBe(true)
  })

  it("legge il primo IP di x-forwarded-for", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4")
    expect(clientIp(new Headers())).toBe("sconosciuto")
  })
})
