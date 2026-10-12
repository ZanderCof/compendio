import type { z } from "zod"

import type {
  abilitySchema,
  attackSchema,
  characterSheetSchema,
  currencySchema,
  featureSchema,
  itemSchema,
  proficiencySchema,
  resourceSchema,
  skillSchema,
  spellcastingSchema,
  spellSchema,
  spellSlotSchema,
} from "./schema"

export type Ability = z.infer<typeof abilitySchema>
export type Proficiency = z.infer<typeof proficiencySchema>
export type Skill = z.infer<typeof skillSchema>
export type Attack = z.infer<typeof attackSchema>
export type Spell = z.infer<typeof spellSchema>
export type SpellSlot = z.infer<typeof spellSlotSchema>
export type Spellcasting = z.infer<typeof spellcastingSchema>
export type Item = z.infer<typeof itemSchema>
export type Currency = z.infer<typeof currencySchema>
export type Feature = z.infer<typeof featureSchema>
export type Resource = z.infer<typeof resourceSchema>

/** Contenuto del campo JSON `Character.sheet`. */
export type CharacterSheet = z.infer<typeof characterSheetSchema>

/** Scheda completa con l'id del personaggio, come la usano i componenti. */
export type Character = CharacterSheet & { id: string }
