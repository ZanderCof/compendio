import { describe, expect, it } from "vitest"

import { buildSheet, newCharacterSchema } from "./create"
import { applyChanges, changeLabel, deepEqual, describeListChange, diffSheets, formatValue } from "./diff"
import { characterSheetSchema } from "./schema"
import type { CharacterSheet } from "./types"

const base: CharacterSheet = buildSheet(
  newCharacterSchema.parse({
    name: "Lyra",
    race: "Mezzelfa",
    className: "Chierico",
    level: 5,
    abilities: { str: 10, dex: 14, con: 14, int: 12, wis: 18, cha: 13 },
  }),
  "Ale"
)

describe("deepEqual", () => {
  it("ignora l'ordine delle chiavi", () => {
    expect(deepEqual({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true)
  })

  it("considera uguali campo assente e null", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: null })).toBe(true)
  })
})

describe("diffSheets", () => {
  it("nessuna modifica, nessuna differenza", () => {
    expect(diffSheets(base, structuredClone(base))).toEqual([])
  })

  it("scende dentro gli oggetti fino al singolo campo", () => {
    const after = structuredClone(base)
    after.hitPoints.current = 20
    after.abilities.str = 16
    expect(diffSheets(base, after)).toEqual([
      { path: "abilities.str", from: 10, to: 16 },
      { path: "hitPoints.current", from: 38, to: 20 },
    ])
  })

  it("le liste cambiano come blocco unico", () => {
    const after = structuredClone(base)
    after.equipment.push({ name: "Corda", quantity: 1 })
    const changes = diffSheets(base, after)
    expect(changes).toHaveLength(1)
    expect(changes[0].path).toBe("equipment")
  })

  it("un campo facoltativo tolto diventa null", () => {
    const before = { ...base, subclass: "Luce" }
    expect(diffSheets(before, base)).toEqual([{ path: "subclass", from: "Luce", to: null }])
  })
})

describe("applyChanges", () => {
  it("applica le modifiche e la scheda resta valida", () => {
    const after = structuredClone(base)
    after.hitPoints.current = 10
    after.skills.stealth = "proficient"
    after.subclass = "Luce"
    const result = applyChanges(base, diffSheets(base, after))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const parsed = characterSheetSchema.parse(result.sheet)
    expect(parsed.hitPoints.current).toBe(10)
    expect(parsed.skills.stealth).toBe("proficient")
    expect(parsed.subclass).toBe("Luce")
  })

  it("toglie un campo facoltativo quando il nuovo valore è null", () => {
    const before = { ...base, subclass: "Luce" }
    const result = applyChanges(before, [{ path: "subclass", from: "Luce", to: null }])
    expect(result.ok && "subclass" in (result.sheet as object)).toBe(false)
  })

  it("segnala un conflitto se il giocatore ha cambiato lo stesso campo", () => {
    const proposal = structuredClone(base)
    proposal.hitPoints.current = 10
    const changes = diffSheets(base, proposal)

    const playerNow = structuredClone(base)
    playerNow.hitPoints.current = 25 // il giocatore ha subito danni nel frattempo
    const result = applyChanges(playerNow, changes)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.conflicts[0].path).toBe("hitPoints.current")
  })

  it("non è un conflitto se il giocatore ha cambiato altri campi", () => {
    const proposal = structuredClone(base)
    proposal.hitPoints.current = 10
    const playerNow = structuredClone(base)
    playerNow.currency.gp = 50
    const result = applyChanges(playerNow, diffSheets(base, proposal))
    expect(result.ok).toBe(true)
    if (result.ok) expect(characterSheetSchema.parse(result.sheet).currency.gp).toBe(50)
  })
})

describe("descrizioni", () => {
  it("etichette leggibili", () => {
    expect(changeLabel("hitPoints.current")).toBe("PF attuali")
    expect(changeLabel("abilities.str")).toBe("Forza")
    expect(changeLabel("skills.stealth")).toBe("Abilità: Furtività")
  })

  it("valori leggibili", () => {
    expect(formatValue("inspiration", true)).toBe("sì")
    expect(formatValue("skills.stealth", "expertise")).toBe("maestria")
    expect(formatValue("savingThrows", ["wis", "cha"])).toBe("SAG, CAR")
  })

  it("liste: aggiunti e tolti", () => {
    expect(
      describeListChange({
        path: "equipment",
        from: [{ name: "Corda" }, { name: "Torcia" }],
        to: [{ name: "Corda" }, { name: "Pozione" }],
      })
    ).toEqual({ added: ["Pozione"], removed: ["Torcia"] })
  })
})
