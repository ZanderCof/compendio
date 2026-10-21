// Livello del profilo calcolato dall'EXP totale. Curva crescente morbida: il primo livello costa
// FIRST_LEVEL EXP e ognuno dei successivi STEP in più (2 → 100, 3 → 250, 4 → 450, 5 → 700…).
// Per cambiarla basta toccare le due costanti.

const FIRST_LEVEL = 100
const STEP = 50

/** EXP totale necessaria per raggiungere il livello indicato (il livello 1 parte da 0). */
export function xpForLevel(level: number) {
  // Somma dei costi dei livelli 2..n: k = n − 1 livelli, da FIRST_LEVEL crescendo di STEP
  const k = Math.max(1, Math.floor(level)) - 1
  return k * FIRST_LEVEL + (STEP * k * (k - 1)) / 2
}

/** Livello raggiunto con questa EXP. */
export function levelForXp(xp: number) {
  // Inversa di xpForLevel (equazione di secondo grado in k), poi si corregge l'arrotondamento
  const a = STEP / 2
  const b = FIRST_LEVEL - STEP / 2
  const k = (-b + Math.sqrt(b * b + 4 * a * Math.max(0, xp))) / (2 * a)
  let level = Math.max(1, Math.floor(k) + 1)
  while (xpForLevel(level + 1) <= xp) level++
  while (level > 1 && xpForLevel(level) > xp) level--
  return level
}

export type XpProgress = {
  level: number
  /** EXP totale */
  xp: number
  /** EXP guadagnata dentro il livello attuale */
  intoLevel: number
  /** EXP che serve in tutto per passare al livello successivo */
  levelSize: number
  /** Quanta ne manca */
  toNext: number
  /** Da 0 a 100 */
  percent: number
}

export function xpProgress(xp: number): XpProgress {
  const safe = Math.max(0, Math.floor(xp))
  const level = levelForXp(safe)
  const start = xpForLevel(level)
  const levelSize = xpForLevel(level + 1) - start
  const intoLevel = safe - start
  return {
    level,
    xp: safe,
    intoLevel,
    levelSize,
    toNext: levelSize - intoLevel,
    percent: Math.floor((intoLevel / levelSize) * 100),
  }
}
