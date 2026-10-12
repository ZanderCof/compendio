import type { Ability, Attack, Character, Currency, Feature, Item, Skill, Spell } from "./types"

// Tutte le modifiche alla scheda passano da qui: funzioni pure, facili da testare.
// Oggi le usa lo stato nel browser, domani le stesse azioni andranno al database.

export type CharacterAction =
  | { type: "replace"; character: Character }
  // Salute
  | { type: "damage"; amount: number }
  | { type: "heal"; amount: number }
  | { type: "setTempHp"; amount: number }
  | { type: "setMaxHp"; value: number }
  | { type: "setDeathSaves"; successes: number; failures: number }
  | { type: "deathSaveRoll"; natural: number }
  | { type: "useHitDie"; healed: number }
  | { type: "setHitDiceUsed"; used: number }
  | { type: "longRest" }
  | { type: "toggleInspiration" }
  // Incantesimi
  | { type: "setSlotUsed"; level: number; used: number }
  | { type: "toggleSpellPrepared"; name: string }
  // Inventario
  | { type: "setCurrency"; coin: keyof Currency; value: number }
  | { type: "setItemQuantity"; index: number; quantity: number }
  | { type: "toggleEquipped"; index: number }
  | { type: "addItem"; item: Item }
  | { type: "removeItem"; index: number }
  // Modalità modifica
  | { type: "setAbility"; ability: Ability; score: number }
  | { type: "cycleSkill"; skill: Skill }
  | { type: "toggleSave"; ability: Ability }
  | { type: "setStat"; stat: "level" | "armorClass" | "speed" | "experience"; value: number }
  | { type: "addAttack"; attack: Attack }
  | { type: "removeAttack"; index: number }
  | { type: "addSpell"; spell: Spell }
  | { type: "removeSpell"; name: string; level: number }
  | { type: "addFeature"; feature: Feature }
  | { type: "removeFeature"; index: number }
  | { type: "setPersonality"; field: keyof Character["personality"]; value: string }
  | { type: "setBackstory"; value: string }

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(value)))

const STAT_LIMITS = {
  level: [1, 20],
  armorClass: [0, 40],
  speed: [0, 60],
  experience: [0, 355000],
} as const

const NEXT_PROFICIENCY = { none: "proficient", proficient: "expertise", expertise: "none" } as const

export function characterReducer(c: Character, action: CharacterAction): Character {
  switch (action.type) {
    case "replace":
      return action.character

    case "damage": {
      const amount = Math.max(0, Math.trunc(action.amount))
      if (amount === 0) return c
      // A 0 PF ogni colpo subito è un fallimento del tiro contro la morte
      if (c.hitPoints.current === 0) {
        return withDeathSaves(c, c.deathSaves.successes, c.deathSaves.failures + 1)
      }
      // I danni scalano prima dai PF temporanei
      const fromTemp = Math.min(c.hitPoints.temp, amount)
      const current = Math.max(0, c.hitPoints.current - (amount - fromTemp))
      return { ...c, hitPoints: { ...c.hitPoints, temp: c.hitPoints.temp - fromTemp, current } }
    }

    case "heal": {
      const amount = Math.max(0, Math.trunc(action.amount))
      if (amount === 0) return c
      const current = Math.min(c.hitPoints.max, c.hitPoints.current + amount)
      // Chi torna sopra 0 PF azzera i tiri contro la morte
      const deathSaves = c.hitPoints.current === 0 ? { successes: 0, failures: 0 } : c.deathSaves
      return { ...c, hitPoints: { ...c.hitPoints, current }, deathSaves }
    }

    case "setTempHp":
      return { ...c, hitPoints: { ...c.hitPoints, temp: clamp(action.amount, 0, 999) } }

    case "setMaxHp": {
      const max = clamp(action.value, 1, 999)
      return { ...c, hitPoints: { ...c.hitPoints, max, current: Math.min(c.hitPoints.current, max) } }
    }

    case "setDeathSaves":
      return withDeathSaves(c, action.successes, action.failures)

    case "deathSaveRoll": {
      // 20 naturale: torni a 1 PF. 1 naturale: due fallimenti. 10 o più: successo.
      if (action.natural === 20) {
        return {
          ...c,
          hitPoints: { ...c.hitPoints, current: 1 },
          deathSaves: { successes: 0, failures: 0 },
        }
      }
      const { successes, failures } = c.deathSaves
      if (action.natural === 1) return withDeathSaves(c, successes, failures + 2)
      if (action.natural >= 10) return withDeathSaves(c, successes + 1, failures)
      return withDeathSaves(c, successes, failures + 1)
    }

    case "useHitDie": {
      if (c.hitDice.used >= c.hitDice.total) return c
      const healed = Math.max(0, Math.trunc(action.healed))
      return {
        ...characterReducer(c, { type: "heal", amount: healed }),
        hitDice: { ...c.hitDice, used: c.hitDice.used + 1 },
      }
    }

    case "setHitDiceUsed":
      return { ...c, hitDice: { ...c.hitDice, used: clamp(action.used, 0, c.hitDice.total) } }

    case "longRest": {
      // Tutti i PF, metà dei dadi vita (minimo 1), tutti gli slot. I PF temporanei svaniscono.
      const recovered = Math.max(1, Math.floor(c.hitDice.total / 2))
      return {
        ...c,
        hitPoints: { ...c.hitPoints, current: c.hitPoints.max, temp: 0 },
        hitDice: { ...c.hitDice, used: Math.max(0, c.hitDice.used - recovered) },
        deathSaves: { successes: 0, failures: 0 },
        spellcasting: c.spellcasting && {
          ...c.spellcasting,
          slots: c.spellcasting.slots.map((slot) => ({ ...slot, used: 0 })),
        },
      }
    }

    case "toggleInspiration":
      return { ...c, inspiration: !c.inspiration }

    case "setSlotUsed": {
      if (!c.spellcasting) return c
      return {
        ...c,
        spellcasting: {
          ...c.spellcasting,
          slots: c.spellcasting.slots.map((slot) =>
            slot.level === action.level ? { ...slot, used: clamp(action.used, 0, slot.total) } : slot
          ),
        },
      }
    }

    case "toggleSpellPrepared": {
      if (!c.spellcasting) return c
      return {
        ...c,
        spellcasting: {
          ...c.spellcasting,
          spells: c.spellcasting.spells.map((spell) =>
            spell.name === action.name && spell.level > 0
              ? { ...spell, prepared: !spell.prepared }
              : spell
          ),
        },
      }
    }

    case "setCurrency":
      return { ...c, currency: { ...c.currency, [action.coin]: clamp(action.value, 0, 9_999_999) } }

    case "setItemQuantity":
      return {
        ...c,
        equipment: c.equipment.map((item, i) =>
          i === action.index ? { ...item, quantity: clamp(action.quantity, 0, 9999) } : item
        ),
      }

    case "toggleEquipped":
      return {
        ...c,
        equipment: c.equipment.map((item, i) =>
          i === action.index ? { ...item, equipped: !item.equipped } : item
        ),
      }

    case "addItem": {
      const name = action.item.name.trim()
      if (!name) return c
      return { ...c, equipment: [...c.equipment, { ...action.item, name }] }
    }

    case "removeItem":
      return { ...c, equipment: c.equipment.filter((_, i) => i !== action.index) }

    case "setAbility":
      return { ...c, abilities: { ...c.abilities, [action.ability]: clamp(action.score, 1, 30) } }

    case "cycleSkill": {
      const current = c.skills[action.skill] ?? "none"
      return { ...c, skills: { ...c.skills, [action.skill]: NEXT_PROFICIENCY[current] } }
    }

    case "toggleSave": {
      const has = c.savingThrows.includes(action.ability)
      return {
        ...c,
        savingThrows: has
          ? c.savingThrows.filter((a) => a !== action.ability)
          : [...c.savingThrows, action.ability],
      }
    }

    case "setStat": {
      const [min, max] = STAT_LIMITS[action.stat]
      return { ...c, [action.stat]: clamp(action.value, min, max) }
    }

    case "addAttack": {
      const name = action.attack.name.trim()
      if (!name) return c
      return { ...c, attacks: [...c.attacks, { ...action.attack, name }] }
    }

    case "removeAttack":
      return { ...c, attacks: c.attacks.filter((_, i) => i !== action.index) }

    case "addSpell": {
      const name = action.spell.name.trim()
      if (!name || !c.spellcasting) return c
      const exists = c.spellcasting.spells.some((s) => s.name === name && s.level === action.spell.level)
      if (exists) return c
      return {
        ...c,
        spellcasting: { ...c.spellcasting, spells: [...c.spellcasting.spells, { ...action.spell, name }] },
      }
    }

    case "removeSpell": {
      if (!c.spellcasting) return c
      return {
        ...c,
        spellcasting: {
          ...c.spellcasting,
          spells: c.spellcasting.spells.filter(
            (s) => !(s.name === action.name && s.level === action.level)
          ),
        },
      }
    }

    case "addFeature": {
      const name = action.feature.name.trim()
      if (!name) return c
      return { ...c, features: [...c.features, { ...action.feature, name }] }
    }

    case "removeFeature":
      return { ...c, features: c.features.filter((_, i) => i !== action.index) }

    case "setPersonality":
      return { ...c, personality: { ...c.personality, [action.field]: action.value.slice(0, 2000) } }

    case "setBackstory":
      return { ...c, backstory: action.value.slice(0, 10000) }
  }
}

function withDeathSaves(c: Character, successes: number, failures: number): Character {
  return { ...c, deathSaves: { successes: clamp(successes, 0, 3), failures: clamp(failures, 0, 3) } }
}
