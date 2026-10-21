// Regole delle missioni settimanali: requisiti, settimana, esito della prova e ricompense.
// Funzioni pure (niente DB): le usano le azioni del server e i test.
import { abilityModifier } from "@/features/characters/rules"
import type { Ability, CharacterSheet } from "@/features/characters/types"

export type MissionRules = {
  minLevel: number
  allowedClasses: string[]
  allowedRaces: string[]
  startsAt: Date
  endsAt: Date
  closedAt: Date | null
}

/** La missione è aperta adesso: dentro la sua settimana e non chiusa dall'admin. */
export function isMissionOpen(mission: Pick<MissionRules, "startsAt" | "endsAt" | "closedAt">, now: Date) {
  return !mission.closedAt && mission.startsAt <= now && now < mission.endsAt
}

/** Motivo per cui il personaggio non può partire per questa missione, oppure null se può. */
export function eligibilityProblem(
  mission: MissionRules,
  sheet: Pick<CharacterSheet, "level" | "className" | "race">
): string | null {
  if (sheet.level < mission.minLevel) return `Serve almeno il livello ${mission.minLevel}`
  const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  if (mission.allowedClasses.length > 0 && !mission.allowedClasses.some((c) => sameText(c, sheet.className))) {
    return `Solo per: ${mission.allowedClasses.join(", ")}`
  }
  if (mission.allowedRaces.length > 0 && !mission.allowedRaces.some((r) => sameText(r, sheet.race))) {
    return `Solo per: ${mission.allowedRaces.join(", ")}`
  }
  return null
}

/**
 * Settimana ISO (lunedì–domenica) dell'ora italiana, es. "2026-W43".
 * Serve per il limite di una missione a settimana per personaggio.
 */
export function weekKey(date: Date) {
  // Giorno di calendario in Italia, poi calcolo ISO su una data UTC "neutra"
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(date).split("-").map(Number)
  const day = new Date(Date.UTC(y!, m! - 1, d!))
  const weekday = day.getUTCDay() || 7
  // Il giovedì della stessa settimana decide l'anno ISO
  day.setUTCDate(day.getUTCDate() + 4 - weekday)
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

export type MissionOutcome = {
  natural: number
  total: number
  success: boolean
  xpAwarded: number
}

/** Esito della prova al ritorno: d20 + modificatore contro la CD. Fallita: metà EXP (per difetto). */
export function resolveOutcome(natural: number, modifier: number, dc: number, xpReward: number): MissionOutcome {
  const total = natural + modifier
  const success = total >= dc
  return { natural, total, success, xpAwarded: success ? xpReward : Math.floor(xpReward / 2) }
}

/** Modificatore della caratteristica della prova, dal punteggio sulla scheda. */
export function missionModifier(sheet: Pick<CharacterSheet, "abilities">, ability: Ability) {
  return abilityModifier(sheet.abilities[ability])
}

/** Scheda con le ricompense della missione: oggetto nell'equipaggiamento e monete d'oro. Solo se riuscita. */
export function applyMissionReward(
  sheet: CharacterSheet,
  reward: { rewardItem: string | null; rewardGold: number }
): CharacterSheet {
  const item = reward.rewardItem?.trim()
  return {
    ...sheet,
    equipment: item ? [...sheet.equipment, { name: item, quantity: 1 }] : sheet.equipment,
    currency: { ...sheet.currency, gp: sheet.currency.gp + Math.max(0, reward.rewardGold) },
  }
}

/** Mezzanotte del giorno "AAAA-MM-GG" in Italia (ora solare o legale), più eventuali giorni. */
export function romeMidnight(day: string, addDays = 0) {
  // Prima stima con l'ora solare (+01:00), poi si corregge se quel giorno vale l'ora legale
  const guess = new Date(`${day}T00:00:00+01:00`)
  guess.setUTCDate(guess.getUTCDate() + addDays)
  const hourInRome = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" }).format(guess)
  )
  return new Date(guess.getTime() - hourInRome * 3_600_000)
}
