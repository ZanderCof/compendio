import { describe, expect, it } from "vitest"

import { campaignCover, campaignInitials } from "./cover"

describe("campaignInitials", () => {
  it("salta gli articoli e prende due parole", () => {
    expect(campaignInitials("La Miniera Perduta di Phandelver")).toBe("MP")
    expect(campaignInitials("L'ombra del drago")).toBe("OD")
    expect(campaignInitials("Curse of Strahd")).toBe("CS")
  })

  it("una parola sola, numeri e casi limite", () => {
    expect(campaignInitials("eberron")).toBe("E")
    expect(campaignInitials("Tomba 2")).toBe("T2")
    expect(campaignInitials("La")).toBe("L")
    expect(campaignInitials("!!!")).toBe("?")
  })
})

describe("campaignCover", () => {
  it("stesso nome, stessa copertina (anche con maiuscole e spazi diversi)", () => {
    expect(campaignCover("Curse of Strahd")).toEqual(campaignCover("  curse of strahd "))
  })

  it("due colori diversi della palette e valori nei limiti", () => {
    for (const name of ["A", "Phandelver", "Waterdeep", "Tomba dell'annientamento", "Avernus", "x".repeat(80)]) {
      const cover = campaignCover(name)
      expect(cover.from).not.toBe(cover.to)
      expect(cover.angle).toBeGreaterThanOrEqual(90)
      expect(cover.angle).toBeLessThan(270)
      expect([0, 1, 2]).toContain(cover.pattern)
    }
  })
})
