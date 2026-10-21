import { describe, expect, it } from "vitest"

import { classTone, hpPercent, hpTone } from "./look"

describe("hpTone", () => {
  it("verde sopra metà, ambra fino a un quarto, rosso sotto, a terra a 0", () => {
    expect(hpTone(38, 38)).toBe("healthy")
    expect(hpTone(20, 38)).toBe("healthy")
    expect(hpTone(19, 38)).toBe("wounded")
    expect(hpTone(10, 38)).toBe("wounded")
    expect(hpTone(9, 38)).toBe("critical")
    expect(hpTone(0, 38)).toBe("down")
    expect(hpTone(5, 0)).toBe("down")
  })
})

describe("hpPercent", () => {
  it("resta tra 0 e 100", () => {
    expect(hpPercent(31, 38)).toBe(82)
    expect(hpPercent(-3, 10)).toBe(0)
    expect(hpPercent(15, 10)).toBe(100)
    expect(hpPercent(1, 0)).toBe(0)
  })
})

describe("classTone", () => {
  it("colore per classe, neutro per quelle sconosciute", () => {
    expect(classTone("Warlock").ring).toBe("ring-violet")
    expect(classTone("Guerriero").ring).toBe("ring-red-600")
    expect(classTone("Artefice").ring).toBe("ring-periwinkle")
  })
})
