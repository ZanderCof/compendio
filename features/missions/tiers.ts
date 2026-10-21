// Livelli delle missioni: dal bronzo al diamante, sempre più difficili e più generosi.
// I valori sono predefiniti: l'admin può cambiarli missione per missione.

export const MISSION_TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const
export type MissionTier = (typeof MISSION_TIERS)[number]

export type TierDefaults = { xpReward: number; dc: number; durationHours: number; minLevel: number }

export const TIERS: Record<MissionTier, { label: string; defaults: TierDefaults }> = {
  BRONZE: { label: "Bronzo", defaults: { xpReward: 25, dc: 10, durationHours: 4, minLevel: 1 } },
  SILVER: { label: "Argento", defaults: { xpReward: 50, dc: 12, durationHours: 8, minLevel: 3 } },
  GOLD: { label: "Oro", defaults: { xpReward: 100, dc: 14, durationHours: 24, minLevel: 5 } },
  PLATINUM: { label: "Platino", defaults: { xpReward: 175, dc: 16, durationHours: 48, minLevel: 8 } },
  DIAMOND: { label: "Diamante", defaults: { xpReward: 300, dc: 18, durationHours: 72, minLevel: 11 } },
}

/** Le missioni di diamante sono rarissime: tra una e l'altra almeno questi giorni. */
export const DIAMOND_GAP_DAYS = 30

/** Valori finali: quelli scritti dall'admin, altrimenti i predefiniti del livello. */
export function resolveTierValues(tier: MissionTier, overrides: Partial<TierDefaults>): TierDefaults {
  const defaults = TIERS[tier].defaults
  return {
    xpReward: overrides.xpReward ?? defaults.xpReward,
    dc: overrides.dc ?? defaults.dc,
    durationHours: overrides.durationHours ?? defaults.durationHours,
    minLevel: overrides.minLevel ?? defaults.minLevel,
  }
}

/**
 * Se c'è già un diamante a meno di DIAMOND_GAP_DAYS giorni (prima o dopo), restituisce la sua data
 * di inizio: il nuovo diamante non si può creare. Altrimenti null.
 */
export function diamondTooClose(newStart: Date, existingStarts: Date[]): Date | null {
  const gap = DIAMOND_GAP_DAYS * 86_400_000
  return existingStarts.find((start) => Math.abs(start.getTime() - newStart.getTime()) < gap) ?? null
}

/** Dal livello più prezioso al più comune: per ordinare la bacheca. */
export const tierRank = (tier: MissionTier) => MISSION_TIERS.indexOf(tier)
