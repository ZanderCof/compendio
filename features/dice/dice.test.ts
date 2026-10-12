import { describe, expect, it } from "vitest"

import { cryptoRng, d20, format, naturalD20, parse, roll, type Rng } from "./dice"

/** Rng finto che restituisce i valori indicati, in ordine. */
const sequence = (...values: number[]): Rng => {
  let i = 0
  return () => values[i++]
}

describe("parse", () => {
  it.each([
    ["d20", { count: 1, sides: 20, mode: null, keep: null, modifier: 0 }],
    ["2d8-1", { count: 2, sides: 8, mode: null, keep: null, modifier: -1 }],
    ["3d20kh1+5", { count: 3, sides: 20, mode: "kh", keep: 1, modifier: 5 }],
    ["4D6KL3", { count: 4, sides: 6, mode: "kl", keep: 3, modifier: 0 }],
    [" 2 d 6 + 3 ", { count: 2, sides: 6, mode: null, keep: null, modifier: 3 }],
  ])("legge %s", (text, expected) => {
    expect(parse(text)).toEqual(expected)
  })

  it.each(["", "d", "20", "0d6", "2d1", "2d6kh3", "2d6kh0", "101d6", "1d1001", "2d6+", "abc"])(
    "rifiuta %j",
    (text) => {
      expect(() => parse(text)).toThrow()
    }
  )
})

describe("format", () => {
  it.each(["d20", "2d8-1", "3d20kh1+5", "4d6kl3"])("%s fa andata e ritorno", (text) => {
    expect(format(parse(text))).toBe(text)
  })
})

describe("roll", () => {
  it("tiene i dadi più alti con kh", () => {
    const result = roll(parse("4d6kh3+2"), sequence(3, 6, 1, 5))
    expect(result.rolls).toEqual([3, 6, 1, 5])
    expect(result.kept).toEqual([6, 5, 3])
    expect(result.total).toBe(16)
  })

  it("tiene i dadi più bassi con kl", () => {
    const result = roll(parse("2d20kl1"), sequence(17, 4))
    expect(result.kept).toEqual([4])
    expect(result.total).toBe(4)
  })

  it("senza keep somma tutti i dadi", () => {
    const result = roll(parse("3d8-1"), sequence(2, 8, 5))
    expect(result.kept).toEqual(result.rolls)
    expect(result.total).toBe(14)
  })
})

describe("d20", () => {
  it("con vantaggio tira 2d20 e tiene il più alto", () => {
    expect(format(d20(7, "advantage"))).toBe("2d20kh1+7")
    expect(format(d20(-1, "disadvantage"))).toBe("2d20kl1-1")
    expect(format(d20(0))).toBe("d20")
  })
})

describe("cryptoRng", () => {
  it("resta sempre tra 1 e il numero di facce", () => {
    for (let i = 0; i < 2000; i++) {
      const value = cryptoRng(6)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(6)
    }
  })
})

describe("naturalD20", () => {
  it.each([
    ["d20+4", [17], 17],
    ["2d20kh1+7", [20], 20],
    ["d200", [150], null],
    ["2d6", [3, 4], null],
  ] as const)("%s con %j → %s", (notation, kept, expected) => {
    expect(naturalD20(notation, [...kept])).toBe(expected)
  })
})
