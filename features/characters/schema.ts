import { z } from "zod"

// Schema della scheda salvata nel campo JSON `Character.sheet`.
// I tipi in types.ts sono ricavati da qui, così validazione e tipi non divergono.

export const abilitySchema = z.enum(["str", "dex", "con", "int", "wis", "cha"])

export const proficiencySchema = z.enum(["none", "proficient", "expertise"])

export const skillSchema = z.enum([
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival",
])

const score = z.number().int().min(1).max(30)
const nonNegative = z.number().int().min(0)

export const attackSchema = z.object({
  name: z.string().min(1),
  ability: abilitySchema,
  proficient: z.boolean(),
  damage: z.string(),
  damageType: z.string(),
  notes: z.string().optional(),
})

export const spellSchema = z.object({
  name: z.string().min(1),
  level: z.number().int().min(0).max(9), // 0 = trucchetto
  prepared: z.boolean().optional(),
})

export const spellSlotSchema = z.object({
  level: z.number().int().min(1).max(9),
  total: nonNegative,
  used: nonNegative,
})

export const spellcastingSchema = z.object({
  ability: abilitySchema,
  slots: z.array(spellSlotSchema),
  spells: z.array(spellSchema),
})

export const itemSchema = z.object({
  name: z.string().min(1),
  quantity: nonNegative,
  weight: z.number().min(0).optional(), // libbre
  equipped: z.boolean().optional(),
})

export const currencySchema = z.object({
  cp: nonNegative,
  sp: nonNegative,
  ep: nonNegative,
  gp: nonNegative,
  pp: nonNegative,
})

// Capacità a usi limitati (Ira, Incanalare Divinità...): si ricaricano con il riposo breve o lungo
export const resourceSchema = z
  .object({
    name: z.string().min(1).max(60),
    max: z.number().int().min(1).max(99),
    used: nonNegative,
    recharge: z.enum(["short", "long"]),
  })
  .refine((r) => r.used <= r.max, "Usati più del massimo")

export const featureSchema = z.object({
  name: z.string().min(1),
  source: z.string(), // es. "Razza", "Classe", "Talento"
  description: z.string(),
})

export const characterSheetSchema = z.object({
  name: z.string().min(1).max(80),
  player: z.string(),
  race: z.string(),
  className: z.string(),
  subclass: z.string().optional(),
  level: z.number().int().min(1).max(20),
  background: z.string(),
  alignment: z.string(),
  experience: nonNegative,

  abilities: z.record(abilitySchema, score),
  savingThrows: z.array(abilitySchema),
  skills: z.partialRecord(skillSchema, proficiencySchema),

  armorClass: nonNegative,
  speed: nonNegative,
  hitPoints: z.object({ current: z.number().int(), max: z.number().int().min(1), temp: nonNegative }),
  hitDice: z.object({ die: z.number().int().min(4).max(12), total: nonNegative, used: nonNegative }),
  deathSaves: z.object({ successes: z.number().int().min(0).max(3), failures: z.number().int().min(0).max(3) }),
  inspiration: z.boolean(),

  attacks: z.array(attackSchema),
  spellcasting: spellcastingSchema.optional(),
  // Le schede create prima di questa funzione non hanno il campo: si parte da una lista vuota
  resources: z.array(resourceSchema).default([]),

  equipment: z.array(itemSchema),
  currency: currencySchema,

  features: z.array(featureSchema),
  proficiencies: z.object({
    armor: z.array(z.string()),
    weapons: z.array(z.string()),
    tools: z.array(z.string()),
    languages: z.array(z.string()),
  }),

  personality: z.object({
    traits: z.string(),
    ideals: z.string(),
    bonds: z.string(),
    flaws: z.string(),
  }),
  backstory: z.string(),
})
