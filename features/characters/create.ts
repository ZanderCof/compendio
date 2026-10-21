import { z } from "zod"

import { findClass, maxHitPoints, spellSlotsFor } from "./classes"
import { abilityModifier } from "./rules"
import { abilitySchema, proficiencySchema, skillSchema } from "./schema"
import type { CharacterSheet } from "./types"

// Dati chiesti nel form di creazione. Il resto della scheda si calcola o parte vuoto.
export const newCharacterSchema = z.object({
  name: z.string().trim().min(1, "Dai un nome al personaggio").max(80),
  race: z.string().trim().min(1, "Indica la razza").max(60),
  className: z.string().trim().min(1, "Scegli una classe").max(60),
  subclass: z.string().trim().max(60).optional(),
  level: z.coerce.number().int().min(1).max(20),
  background: z.string().trim().max(60).default(""),
  alignment: z.string().trim().max(40).default(""),
  abilities: z.record(abilitySchema, z.coerce.number().int().min(1).max(30)),
  skills: z.partialRecord(skillSchema, proficiencySchema).default({}),
  armorClass: z.coerce.number().int().min(0).max(40).optional(),
  speed: z.coerce.number().int().min(0).max(60).default(9),
  campaignId: z.string().optional(),
  // Missioni settimanali fuori dal gioco: si sceglie solo qui, non si cambia più
  missionsEnabled: z.boolean().default(false),
})

export type NewCharacterInput = z.input<typeof newCharacterSchema>
export type NewCharacter = z.output<typeof newCharacterSchema>

/** Costruisce la scheda completa partendo dai dati del form. */
export function buildSheet(input: NewCharacter, playerName: string): CharacterSheet {
  const classInfo = findClass(input.className)
  const hitDie = classInfo?.hitDie ?? 8
  const conMod = abilityModifier(input.abilities.con)
  const maxHp = maxHitPoints(hitDie, input.level, conMod)

  return {
    name: input.name,
    player: playerName,
    race: input.race,
    className: input.className,
    subclass: input.subclass || undefined,
    level: input.level,
    background: input.background,
    alignment: input.alignment,
    experience: 0,

    abilities: input.abilities,
    savingThrows: classInfo ? [...classInfo.savingThrows] : [],
    skills: input.skills,

    // Senza armatura: 10 + Destrezza
    armorClass: input.armorClass ?? 10 + abilityModifier(input.abilities.dex),
    speed: input.speed,
    hitPoints: { current: maxHp, max: maxHp, temp: 0 },
    hitDice: { die: hitDie, total: input.level, used: 0 },
    deathSaves: { successes: 0, failures: 0 },
    inspiration: false,

    attacks: [],
    resources: [],
    spellcasting: classInfo?.caster
      ? {
          ability: classInfo.caster.ability,
          slots: spellSlotsFor(classInfo.caster, input.level),
          spells: [],
        }
      : undefined,

    equipment: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },

    features: [],
    proficiencies: { armor: [], weapons: [], tools: [], languages: ["Comune"] },
    personality: { traits: "", ideals: "", bonds: "", flaws: "" },
    backstory: "",
  }
}
