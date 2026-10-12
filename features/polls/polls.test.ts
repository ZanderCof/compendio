import { describe, expect, it } from "vitest"

import { bestOptions, formatPollDate, pollDatesSchema, tally } from "./polls"

const now = new Date("2026-10-12T18:00:00Z")

describe("pollDatesSchema", () => {
  it("accetta date future e le ordina", () => {
    const parsed = pollDatesSchema(now).parse(["2026-10-20T19:00:00.000Z", "2026-10-17T19:00:00.000Z"])
    expect(parsed.map((d) => d.toISOString())).toEqual(["2026-10-17T19:00:00.000Z", "2026-10-20T19:00:00.000Z"])
  })

  it.each([
    [[], "nessuna data"],
    [["2026-10-01T19:00:00.000Z"], "data passata"],
    [["2026-10-17T19:00:00.000Z", "2026-10-17T19:00:00.000Z"], "doppione"],
    [Array.from({ length: 7 }, (_, i) => `2026-11-0${i + 1}T19:00:00.000Z`), "più di 6"],
    [["domani sera"], "non è una data"],
  ])("rifiuta: %s (%s)", (dates) => {
    expect(pollDatesSchema(now).safeParse(dates).success).toBe(false)
  })
})

describe("tally e bestOptions", () => {
  it("conta le risposte, chi non ha risposto compreso", () => {
    expect(tally(["YES", "MAYBE", "NO", undefined])).toEqual({ yes: 1, maybe: 1, no: 1, missing: 1, score: 3 })
  })

  it("la data migliore ha più sì, poi più forse", () => {
    const tallies = [tally(["YES", "NO", "NO"]), tally(["YES", "YES", "MAYBE"]), tally(["MAYBE", "MAYBE", "MAYBE"])]
    expect(bestOptions(tallies)).toEqual([1])
  })

  it("a pari merito le suggerisce tutte", () => {
    expect(bestOptions([tally(["YES"]), tally(["YES"])])).toEqual([0, 1])
  })

  it("nessuna suggerita se tutti hanno detto no o non hanno risposto", () => {
    expect(bestOptions([tally(["NO", undefined])])).toEqual([])
  })
})

describe("formatPollDate", () => {
  it("usa sempre l'ora italiana, con l'iniziale maiuscola", () => {
    // 19:00 UTC di ottobre = 21:00 in Italia (ora legale)
    const text = formatPollDate(new Date("2026-10-17T19:00:00Z"))
    expect(text).toContain("21:00")
    expect(text.startsWith("Sabato")).toBe(true)
  })
})
