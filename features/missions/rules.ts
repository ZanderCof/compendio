// Regole delle missioni settimanali (fuori dal gioco). Pure: le usano azioni, pagine e test.

export type MissionStatus =
  /** Personaggio normale: non fa missioni */
  | "disabled"
  /** Abilitato e senza campagna: può partire */
  | "home"
  /** Abilitato ma in una campagna: le missioni aspettano che torni a casa */
  | "away"

export function missionStatus(character: { missionsEnabled: boolean; campaignId: string | null }): MissionStatus {
  if (!character.missionsEnabled) return "disabled"
  return character.campaignId ? "away" : "home"
}

/**
 * Un personaggio con le missioni può entrare solo nelle campagne che li ammettono:
 * il master può volere solo personaggi "puliti", senza bonus ottenuti fuori dal gioco.
 */
export function canJoinCampaign(missionsEnabled: boolean, allowMissionCharacters: boolean) {
  return !missionsEnabled || allowMissionCharacters
}

export const MISSION_CAMPAIGN_ERROR =
  "Questa campagna ammette solo personaggi senza missioni settimanali: il master ha chiuso le porte ai bonus fuori gioco"
