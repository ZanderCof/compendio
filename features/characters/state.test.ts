import { describe, expect, it } from "vitest"

import { characterReducer as reduce } from "./state"
import type { Character } from "./types"

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "test",
    name: "Test",
    player: "",
    race: "",
    className: "",
    level: 5,
    background: "",
    alignment: "",
    experience: 0,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: [],
    skills: {},
    armorClass: 10,
    speed: 9,
    hitPoints: { current: 20, max: 30, temp: 5 },
    hitDice: { die: 8, total: 5, used: 4 },
    deathSaves: { successes: 0, failures: 0 },
    inspiration: false,
    attacks: [],
    spellcasting: { ability: "wis", slots: [{ level: 1, total: 4, used: 3 }], spells: [] },
    equipment: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    features: [],
    proficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    personality: { traits: "", ideals: "", bonds: "", flaws: "" },
    backstory: "",
    ...overrides,
  }
}

describe("danni e cure", () => {
  it("i danni scalano prima dai PF temporanei", () => {
    const c = reduce(makeCharacter(), { type: "damage", amount: 8 })
    expect(c.hitPoints).toEqual({ current: 17, max: 30, temp: 0 })
  })

  it("i PF non scendono sotto 0", () => {
    const c = reduce(makeCharacter(), { type: "damage", amount: 100 })
    expect(c.hitPoints.current).toBe(0)
  })

  it("a 0 PF un colpo è un fallimento contro la morte", () => {
    const c = reduce(makeCharacter({ hitPoints: { current: 0, max: 30, temp: 0 } }), {
      type: "damage",
      amount: 3,
    })
    expect(c.deathSaves.failures).toBe(1)
  })

  it("le cure non superano il massimo", () => {
    const c = reduce(makeCharacter(), { type: "heal", amount: 50 })
    expect(c.hitPoints.current).toBe(30)
  })

  it("curarsi da 0 PF azzera i tiri contro la morte", () => {
    const c = reduce(
      makeCharacter({
        hitPoints: { current: 0, max: 30, temp: 0 },
        deathSaves: { successes: 2, failures: 1 },
      }),
      { type: "heal", amount: 4 }
    )
    expect(c.hitPoints.current).toBe(4)
    expect(c.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it("ridurre il massimo abbassa anche i PF attuali", () => {
    const c = reduce(makeCharacter(), { type: "setMaxHp", value: 15 })
    expect(c.hitPoints).toMatchObject({ current: 15, max: 15 })
  })
})

describe("tiri contro la morte", () => {
  const dying = makeCharacter({ hitPoints: { current: 0, max: 30, temp: 0 } })

  it.each([
    [15, { successes: 1, failures: 0 }],
    [10, { successes: 1, failures: 0 }],
    [9, { successes: 0, failures: 1 }],
    [1, { successes: 0, failures: 2 }],
  ])("con %i naturale", (natural, expected) => {
    expect(reduce(dying, { type: "deathSaveRoll", natural }).deathSaves).toEqual(expected)
  })

  it("con 20 naturale torna a 1 PF", () => {
    const c = reduce(dying, { type: "deathSaveRoll", natural: 20 })
    expect(c.hitPoints.current).toBe(1)
  })

  it("non supera 3 fallimenti", () => {
    const c = reduce(
      makeCharacter({ deathSaves: { successes: 0, failures: 2 } }),
      { type: "deathSaveRoll", natural: 1 }
    )
    expect(c.deathSaves.failures).toBe(3)
  })
})

describe("dadi vita e riposo", () => {
  it("usare un dado vita cura e lo consuma", () => {
    const c = reduce(makeCharacter(), { type: "useHitDie", healed: 6 })
    expect(c.hitPoints.current).toBe(26)
    expect(c.hitDice.used).toBe(5)
  })

  it("senza dadi vita rimasti non succede nulla", () => {
    const start = makeCharacter({ hitDice: { die: 8, total: 5, used: 5 } })
    expect(reduce(start, { type: "useHitDie", healed: 6 })).toBe(start)
  })

  it("il riposo lungo ripristina PF, slot e metà dei dadi vita", () => {
    const c = reduce(makeCharacter(), { type: "longRest" })
    expect(c.hitPoints).toEqual({ current: 30, max: 30, temp: 0 })
    expect(c.hitDice.used).toBe(2) // 4 usati - 2 recuperati (metà di 5)
    expect(c.spellcasting?.slots[0].used).toBe(0)
  })
})

describe("modifica", () => {
  it("le competenze ruotano: nessuna → competente → maestria → nessuna", () => {
    let c = makeCharacter()
    c = reduce(c, { type: "cycleSkill", skill: "stealth" })
    expect(c.skills.stealth).toBe("proficient")
    c = reduce(c, { type: "cycleSkill", skill: "stealth" })
    expect(c.skills.stealth).toBe("expertise")
    c = reduce(c, { type: "cycleSkill", skill: "stealth" })
    expect(c.skills.stealth).toBe("none")
  })

  it("i punteggi restano tra 1 e 30", () => {
    expect(reduce(makeCharacter(), { type: "setAbility", ability: "str", score: 99 }).abilities.str).toBe(30)
    expect(reduce(makeCharacter(), { type: "setAbility", ability: "str", score: -3 }).abilities.str).toBe(1)
  })

  it("gli slot usati non superano il totale", () => {
    const c = reduce(makeCharacter(), { type: "setSlotUsed", level: 1, used: 9 })
    expect(c.spellcasting?.slots[0].used).toBe(4)
  })

  it("non aggiunge oggetti senza nome", () => {
    const start = makeCharacter()
    expect(reduce(start, { type: "addItem", item: { name: "  ", quantity: 1 } })).toBe(start)
  })
})

describe("liste", () => {
  it("aggiunge e toglie un incantesimo senza duplicati", () => {
    let c = makeCharacter()
    c = reduce(c, { type: "addSpell", spell: { name: "Cura Ferite", level: 1, prepared: true } })
    c = reduce(c, { type: "addSpell", spell: { name: "Cura Ferite", level: 1 } })
    expect(c.spellcasting?.spells).toHaveLength(1)
    c = reduce(c, { type: "removeSpell", name: "Cura Ferite", level: 1 })
    expect(c.spellcasting?.spells).toHaveLength(0)
  })

  it("aggiunge un attacco togliendo gli spazi dal nome", () => {
    const c = reduce(makeCharacter(), {
      type: "addAttack",
      attack: { name: "  Spada  ", ability: "str", proficient: true, damage: "1d8", damageType: "tagliente" },
    })
    expect(c.attacks[0].name).toBe("Spada")
  })
})
