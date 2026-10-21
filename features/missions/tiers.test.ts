import { describe, expect, it } from "vitest"

import { DIAMOND_GAP_DAYS, MISSION_TIERS, TIERS, diamondTooClose, resolveTierValues } from "./tiers"

describe("livelli delle missioni", () => {
  it("dal bronzo al diamante tutto cresce: EXP, CD, durata e livello minimo", () => {
    for (let i = 1; i < MISSION_TIERS.length; i++) {
      const prev = TIERS[MISSION_TIERS[i - 1]!].defaults
      const next = TIERS[MISSION_TIERS[i]!].defaults
      expect(next.xpReward).toBeGreaterThan(prev.xpReward)
      expect(next.dc).toBeGreaterThan(prev.dc)
      expect(next.durationHours).toBeGreaterThan(prev.durationHours)
      expect(next.minLevel).toBeGreaterThan(prev.minLevel)
    }
  })
})

describe("resolveTierValues", () => {
  it("campi vuoti: valori predefiniti del livello", () => {
    expect(resolveTierValues("GOLD", {})).toEqual(TIERS.GOLD.defaults)
  })

  it("i valori scritti dall'admin vincono, anche se più bassi (bronzo facilissimo)", () => {
    expect(resolveTierValues("BRONZE", { xpReward: 100, dc: 5 })).toEqual({
      ...TIERS.BRONZE.defaults,
      xpReward: 100,
      dc: 5,
    })
    // Lo zero è un valore valido, non "vuoto"
    expect(resolveTierValues("SILVER", { xpReward: 0 }).xpReward).toBe(0)
  })
})

describe("diamondTooClose", () => {
  const day = 86_400_000
  const start = new Date("2026-11-01T00:00:00Z")

  it("nessun altro diamante: si può creare", () => {
    expect(diamondTooClose(start, [])).toBeNull()
  })

  it(`un diamante a meno di ${DIAMOND_GAP_DAYS} giorni, prima o dopo, lo blocca`, () => {
    const before = new Date(start.getTime() - 10 * day)
    const after = new Date(start.getTime() + 29 * day)
    expect(diamondTooClose(start, [before])).toEqual(before)
    expect(diamondTooClose(start, [after])).toEqual(after)
  })

  it(`a ${DIAMOND_GAP_DAYS} giorni o più va bene`, () => {
    expect(diamondTooClose(start, [new Date(start.getTime() - DIAMOND_GAP_DAYS * day)])).toBeNull()
    expect(diamondTooClose(start, [new Date(start.getTime() + 90 * day)])).toBeNull()
  })
})
