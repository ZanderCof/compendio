import { describe, expect, it } from "vitest"

import { levelForXp, xpForLevel, xpProgress } from "./xp"

describe("xpForLevel", () => {
  it("curva crescente: 0, 100, 250, 450, 700…", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 250, 450, 700])
    // Ogni livello costa 50 più del precedente
    expect(xpForLevel(11) - xpForLevel(10)).toBe(100 + 50 * 9)
  })
})

describe("levelForXp", () => {
  it("cambia livello esattamente sulla soglia", () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(99)).toBe(1)
    expect(levelForXp(100)).toBe(2)
    expect(levelForXp(249)).toBe(2)
    expect(levelForXp(250)).toBe(3)
    expect(levelForXp(-50)).toBe(1)
  })

  it("è l'inversa di xpForLevel anche per livelli alti", () => {
    for (let level = 1; level <= 200; level++) {
      expect(levelForXp(xpForLevel(level))).toBe(level)
      expect(levelForXp(xpForLevel(level + 1) - 1)).toBe(level)
    }
  })
})

describe("xpProgress", () => {
  it("nuovo profilo: livello 1, barra vuota, 100 al prossimo", () => {
    expect(xpProgress(0)).toEqual({ level: 1, xp: 0, intoLevel: 0, levelSize: 100, toNext: 100, percent: 0 })
  })

  it("a metà del livello 3", () => {
    expect(xpProgress(350)).toMatchObject({ level: 3, intoLevel: 100, levelSize: 200, toNext: 100, percent: 50 })
  })
})
