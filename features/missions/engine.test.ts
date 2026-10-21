import { describe, expect, it } from "vitest"

import { buildSheet } from "@/features/characters/create"
import {
  applyMissionReward,
  eligibilityProblem,
  isMissionOpen,
  missionModifier,
  resolveOutcome,
  romeMidnight,
  weekKey,
} from "./engine"

const rules = {
  minLevel: 1,
  allowedClasses: [] as string[],
  allowedRaces: [] as string[],
  startsAt: new Date("2026-10-19T00:00:00Z"),
  endsAt: new Date("2026-10-26T00:00:00Z"),
  closedAt: null as Date | null,
}

describe("isMissionOpen", () => {
  it("aperta solo dentro la sua settimana e se non chiusa", () => {
    expect(isMissionOpen(rules, new Date("2026-10-21T12:00:00Z"))).toBe(true)
    expect(isMissionOpen(rules, new Date("2026-10-18T23:59:59Z"))).toBe(false)
    expect(isMissionOpen(rules, new Date("2026-10-26T00:00:00Z"))).toBe(false)
    expect(isMissionOpen({ ...rules, closedAt: new Date() }, new Date("2026-10-21T12:00:00Z"))).toBe(false)
  })
})

describe("eligibilityProblem", () => {
  const ranger = { level: 3, className: "Ranger", race: "Elfo" }

  it("senza requisiti tutti possono partire", () => {
    expect(eligibilityProblem(rules, ranger)).toBeNull()
  })

  it("livello minimo", () => {
    expect(eligibilityProblem({ ...rules, minLevel: 4 }, ranger)).toBe("Serve almeno il livello 4")
    expect(eligibilityProblem({ ...rules, minLevel: 3 }, ranger)).toBeNull()
  })

  it("classi e razze ammesse, senza badare alle maiuscole", () => {
    expect(eligibilityProblem({ ...rules, allowedClasses: ["Guerriero", "Paladino"] }, ranger)).toBe(
      "Solo per: Guerriero, Paladino"
    )
    expect(eligibilityProblem({ ...rules, allowedClasses: ["ranger"] }, ranger)).toBeNull()
    expect(eligibilityProblem({ ...rules, allowedRaces: ["Nano"] }, ranger)).toBe("Solo per: Nano")
    expect(eligibilityProblem({ ...rules, allowedRaces: ["Nano", "Elfo"] }, ranger)).toBeNull()
  })
})

describe("weekKey", () => {
  it("settimana ISO, da lunedì a domenica, con l'ora italiana", () => {
    expect(weekKey(new Date("2026-10-19T08:00:00Z"))).toBe("2026-W43") // lunedì
    expect(weekKey(new Date("2026-10-25T21:00:00Z"))).toBe("2026-W43") // domenica sera
    // Domenica 23:30 in UTC è già lunedì in Italia
    expect(weekKey(new Date("2026-10-25T23:30:00Z"))).toBe("2026-W44")
  })

  it("a cavallo d'anno vale l'anno ISO", () => {
    expect(weekKey(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53")
    expect(weekKey(new Date("2025-12-29T12:00:00Z"))).toBe("2026-W01")
  })
})

describe("resolveOutcome", () => {
  it("riuscita: totale ≥ CD, tutta l'EXP", () => {
    expect(resolveOutcome(12, 3, 15, 80)).toEqual({ natural: 12, total: 15, success: true, xpAwarded: 80 })
  })

  it("fallita: metà EXP per difetto", () => {
    expect(resolveOutcome(5, 2, 15, 75)).toEqual({ natural: 5, total: 7, success: false, xpAwarded: 37 })
  })
})

describe("ricompense", () => {
  const sheet = buildSheet(
    {
      name: "Lyra",
      race: "Elfo",
      className: "Ranger",
      level: 3,
      background: "",
      alignment: "",
      abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
      skills: {},
      speed: 9,
      missionsEnabled: true,
    },
    "Ale"
  )

  it("modificatore dalla caratteristica della prova", () => {
    expect(missionModifier(sheet, "dex")).toBe(3)
    expect(missionModifier(sheet, "cha")).toBe(-1)
  })

  it("oggetto nell'equipaggiamento e oro nelle monete", () => {
    const next = applyMissionReward(sheet, { rewardItem: "  Pozione di guarigione ", rewardGold: 50 })
    expect(next.equipment.at(-1)).toEqual({ name: "Pozione di guarigione", quantity: 1 })
    expect(next.currency.gp).toBe(sheet.currency.gp + 50)
    // La scheda originale non cambia
    expect(sheet.currency.gp).not.toBe(next.currency.gp)
  })

  it("senza oggetto e senza oro la scheda resta uguale", () => {
    const next = applyMissionReward(sheet, { rewardItem: null, rewardGold: 0 })
    expect(next.equipment).toEqual(sheet.equipment)
    expect(next.currency).toEqual(sheet.currency)
  })
})

describe("romeMidnight", () => {
  it("mezzanotte italiana con l'ora solare e con quella legale", () => {
    expect(romeMidnight("2026-12-07").toISOString()).toBe("2026-12-06T23:00:00.000Z")
    expect(romeMidnight("2026-07-06").toISOString()).toBe("2026-07-05T22:00:00.000Z")
  })

  it("aggiunge giorni (fine della settimana di validità)", () => {
    expect(romeMidnight("2026-10-25", 1).toISOString()).toBe("2026-10-25T23:00:00.000Z")
  })
})
