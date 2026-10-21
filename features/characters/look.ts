// Aspetto delle card dei personaggi: colore della classe e della barra PF. Niente React, si testa da solo.

/** Colore di ogni classe: anello attorno all'avatar e chip dei filtri. Classi Tailwind scritte per intero. */
const CLASS_TONES: Record<string, { ring: string; bg: string; text: string }> = {
  Barbaro: { ring: "ring-orange-600", bg: "bg-orange-600", text: "text-orange-600 dark:text-orange-400" },
  Bardo: { ring: "ring-pink-500", bg: "bg-pink-500", text: "text-pink-600 dark:text-pink-400" },
  Chierico: { ring: "ring-amber-400", bg: "bg-amber-400", text: "text-amber-600 dark:text-amber-300" },
  Druido: { ring: "ring-lime-600", bg: "bg-lime-600", text: "text-lime-700 dark:text-lime-400" },
  Guerriero: { ring: "ring-red-600", bg: "bg-red-600", text: "text-red-600 dark:text-red-400" },
  Ladro: { ring: "ring-slate-500", bg: "bg-slate-500", text: "text-slate-600 dark:text-slate-300" },
  Mago: { ring: "ring-blue-500", bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  Monaco: { ring: "ring-sky", bg: "bg-sky", text: "text-sky-700 dark:text-sky" },
  Paladino: { ring: "ring-yellow-400", bg: "bg-yellow-400", text: "text-yellow-600 dark:text-yellow-300" },
  Ranger: { ring: "ring-emerald-600", bg: "bg-emerald-600", text: "text-emerald-700 dark:text-emerald-400" },
  Stregone: { ring: "ring-plum", bg: "bg-plum", text: "text-plum dark:text-pink-300" },
  Warlock: { ring: "ring-violet", bg: "bg-violet", text: "text-violet" },
}

const FALLBACK_TONE = { ring: "ring-periwinkle", bg: "bg-periwinkle", text: "text-periwinkle" }

/** Classi personalizzate o sconosciute prendono il colore neutro della palette. */
export function classTone(className: string) {
  return CLASS_TONES[className] ?? FALLBACK_TONE
}

export type HpTone = "healthy" | "wounded" | "critical" | "down"

/** Verde sopra metà, ambra fino a un quarto, rosso sotto, "a terra" a 0. */
export function hpTone(current: number, max: number): HpTone {
  if (current <= 0 || max <= 0) return "down"
  const ratio = current / max
  if (ratio > 0.5) return "healthy"
  if (ratio > 0.25) return "wounded"
  return "critical"
}

export function hpPercent(current: number, max: number) {
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)))
}
