import { describe, expect, it } from "vitest"

import { maxHitPoints, spellSlotsFor } from "./classes"
import { buildSheet, newCharacterSchema } from "./create"
import { characterSheetSchema } from "./schema"

const base = {
  name: "Lyra",
  race: "Mezzelfa",
  className: "Chierico",
  level: 5,
  abilities: { str: 10, dex: 14, con: 14, int: 12, wis: 18, cha: 13 },
}

describe("maxHitPoints", () => {
  it("dado pieno al 1° livello, poi la media", () => {
    expect(maxHitPoints(8, 1, 2)).toBe(10)
    expect(maxHitPoints(8, 5, 2)).toBe(10 + 4 * 7) // 38
  })

  it("almeno 1 PF per livello anche con Costituzione molto bassa", () => {
    expect(maxHitPoints(6, 3, -5)).toBe(3)
  })
})

describe("spellSlotsFor", () => {
  it("incantatore pieno di 5° livello", () => {
    expect(spellSlotsFor({ ability: "wis", progression: "full" }, 5).map((s) => s.total)).toEqual([4, 3, 2])
  })

  it("mezzo incantatore: niente al 1°, come un pieno di 3° al 5°", () => {
    const half = { ability: "cha", progression: "half" } as const
    expect(spellSlotsFor(half, 1)).toEqual([])
    expect(spellSlotsFor(half, 5).map((s) => s.total)).toEqual([4, 2])
  })

  it("warlock: slot di patto tutti dello stesso livello", () => {
    expect(spellSlotsFor({ ability: "cha", progression: "pact" }, 5)).toEqual([
      { level: 3, total: 2, used: 0 },
    ])
  })
})

describe("buildSheet", () => {
  it("calcola PF, dadi vita, tiri salvezza e slot dalla classe", () => {
    const sheet = buildSheet(newCharacterSchema.parse(base), "Ale")
    expect(sheet.hitPoints).toEqual({ current: 38, max: 38, temp: 0 })
    expect(sheet.hitDice).toEqual({ die: 8, total: 5, used: 0 })
    expect(sheet.savingThrows).toEqual(["wis", "cha"])
    expect(sheet.armorClass).toBe(12) // 10 + Des
    expect(sheet.spellcasting?.ability).toBe("wis")
    expect(sheet.player).toBe("Ale")
  })

  it("una classe personalizzata parte con valori neutri", () => {
    const sheet = buildSheet(newCharacterSchema.parse({ ...base, className: "Artefice" }), "Ale")
    expect(sheet.hitDice.die).toBe(8)
    expect(sheet.savingThrows).toEqual([])
    expect(sheet.spellcasting).toBeUndefined()
  })

  it("la scheda prodotta è valida per lo schema del database", () => {
    const sheet = buildSheet(newCharacterSchema.parse(base), "Ale")
    expect(characterSheetSchema.safeParse(sheet).success).toBe(true)
  })

  it("rifiuta un form senza nome", () => {
    expect(newCharacterSchema.safeParse({ ...base, name: "  " }).success).toBe(false)
  })
})
