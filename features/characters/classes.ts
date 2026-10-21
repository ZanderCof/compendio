import type { Ability, SpellSlot } from "./types"

// Classi del regolamento base (SRD 5.1). Servono a precompilare il personaggio:
// dado vita, tiri salvezza e incantesimi. Tutto resta modificabile dopo.

type Caster = { ability: Ability; progression: "full" | "half" | "pact" }

export type ClassInfo = {
  name: string
  hitDie: number
  savingThrows: [Ability, Ability]
  caster?: Caster
}

export const CLASSES: ClassInfo[] = [
  { name: "Barbaro", hitDie: 12, savingThrows: ["str", "con"] },
  { name: "Bardo", hitDie: 8, savingThrows: ["dex", "cha"], caster: { ability: "cha", progression: "full" } },
  { name: "Chierico", hitDie: 8, savingThrows: ["wis", "cha"], caster: { ability: "wis", progression: "full" } },
  { name: "Druido", hitDie: 8, savingThrows: ["int", "wis"], caster: { ability: "wis", progression: "full" } },
  { name: "Guerriero", hitDie: 10, savingThrows: ["str", "con"] },
  { name: "Ladro", hitDie: 8, savingThrows: ["dex", "int"] },
  { name: "Mago", hitDie: 6, savingThrows: ["int", "wis"], caster: { ability: "int", progression: "full" } },
  { name: "Monaco", hitDie: 8, savingThrows: ["str", "dex"] },
  { name: "Paladino", hitDie: 10, savingThrows: ["wis", "cha"], caster: { ability: "cha", progression: "half" } },
  { name: "Ranger", hitDie: 10, savingThrows: ["str", "dex"], caster: { ability: "wis", progression: "half" } },
  { name: "Stregone", hitDie: 6, savingThrows: ["con", "cha"], caster: { ability: "cha", progression: "full" } },
  { name: "Warlock", hitDie: 8, savingThrows: ["wis", "cha"], caster: { ability: "cha", progression: "pact" } },
]

export const findClass = (name: string) => CLASSES.find((c) => c.name === name)

/** Razze proposte nel form di creazione (si può anche scriverne una diversa). */
export const RACES = ["Umano", "Elfo", "Mezzelfo", "Nano", "Halfling", "Gnomo", "Mezzorco", "Dragonide", "Tiefling"]

// Slot per livello di incantatore pieno: indice = livello dell'incantatore - 1,
// valori = slot di 1°, 2°, ... 9° livello.
const FULL_CASTER_SLOTS: number[][] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

export function spellSlotsFor(caster: Caster, level: number): SpellSlot[] {
  if (caster.progression === "pact") {
    // Warlock: pochi slot, tutti dello stesso livello
    const total = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1
    const slotLevel = Math.min(5, Math.ceil(level / 2))
    return [{ level: slotLevel, total, used: 0 }]
  }

  // Mezzo incantatore (Paladino, Ranger): niente slot al 1° livello, poi come un pieno di metà livello
  const casterLevel = caster.progression === "full" ? level : level < 2 ? 0 : Math.ceil(level / 2)
  if (casterLevel === 0) return []
  return FULL_CASTER_SLOTS[casterLevel - 1].map((total, i) => ({ level: i + 1, total, used: 0 }))
}

/** PF massimi: dado pieno al 1° livello, poi la media arrotondata per eccesso. Minimo 1 per livello. */
export function maxHitPoints(hitDie: number, level: number, conModifier: number) {
  const first = Math.max(1, hitDie + conModifier)
  const perLevel = Math.max(1, hitDie / 2 + 1 + conModifier)
  return first + perLevel * (level - 1)
}
