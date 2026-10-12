import type { Ability, Character, Proficiency, Skill } from "./types"

export const ABILITIES: { key: Ability; label: string; short: string }[] = [
  { key: "str", label: "Forza", short: "FOR" },
  { key: "dex", label: "Destrezza", short: "DES" },
  { key: "con", label: "Costituzione", short: "COS" },
  { key: "int", label: "Intelligenza", short: "INT" },
  { key: "wis", label: "Saggezza", short: "SAG" },
  { key: "cha", label: "Carisma", short: "CAR" },
]

export const SKILLS: { key: Skill; label: string; ability: Ability }[] = [
  { key: "acrobatics", label: "Acrobazia", ability: "dex" },
  { key: "animalHandling", label: "Addestrare Animali", ability: "wis" },
  { key: "arcana", label: "Arcano", ability: "int" },
  { key: "athletics", label: "Atletica", ability: "str" },
  { key: "deception", label: "Inganno", ability: "cha" },
  { key: "history", label: "Storia", ability: "int" },
  { key: "insight", label: "Intuizione", ability: "wis" },
  { key: "intimidation", label: "Intimidire", ability: "cha" },
  { key: "investigation", label: "Indagare", ability: "int" },
  { key: "medicine", label: "Medicina", ability: "wis" },
  { key: "nature", label: "Natura", ability: "int" },
  { key: "perception", label: "Percezione", ability: "wis" },
  { key: "performance", label: "Intrattenere", ability: "cha" },
  { key: "persuasion", label: "Persuasione", ability: "cha" },
  { key: "religion", label: "Religione", ability: "int" },
  { key: "sleightOfHand", label: "Rapidità di Mano", ability: "dex" },
  { key: "stealth", label: "Furtività", ability: "dex" },
  { key: "survival", label: "Sopravvivenza", ability: "wis" },
]

export const abilityLabel = (ability: Ability) =>
  ABILITIES.find((a) => a.key === ability)!.short

/** Modificatore di caratteristica: (punteggio - 10) / 2 arrotondato per difetto. */
export const abilityModifier = (score: number) => Math.floor((score - 10) / 2)

/** Bonus di competenza: +2 ai livelli 1-4, poi +1 ogni 4 livelli. */
export const proficiencyBonus = (level: number) => Math.ceil(level / 4) + 1

/** Formatta un numero con il segno: 3 → "+3", -1 → "-1". */
export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

const PROFICIENCY_MULTIPLIER: Record<Proficiency, number> = {
  none: 0,
  proficient: 1,
  expertise: 2,
}

export function savingThrowBonus(character: Character, ability: Ability) {
  const mod = abilityModifier(character.abilities[ability])
  const proficient = character.savingThrows.includes(ability)
  return mod + (proficient ? proficiencyBonus(character.level) : 0)
}

export function skillBonus(character: Character, skill: Skill, ability: Ability) {
  const proficiency = character.skills[skill] ?? "none"
  return (
    abilityModifier(character.abilities[ability]) +
    PROFICIENCY_MULTIPLIER[proficiency] * proficiencyBonus(character.level)
  )
}

export function attackBonus(character: Character, ability: Ability, proficient: boolean) {
  return (
    abilityModifier(character.abilities[ability]) +
    (proficient ? proficiencyBonus(character.level) : 0)
  )
}

export const passivePerception = (character: Character) =>
  10 + skillBonus(character, "perception", "wis")

export const initiative = (character: Character) =>
  abilityModifier(character.abilities.dex)

export function spellSaveDC(character: Character, ability: Ability) {
  return 8 + proficiencyBonus(character.level) + abilityModifier(character.abilities[ability])
}

export const spellAttackBonus = (character: Character, ability: Ability) =>
  attackBonus(character, ability, true)
