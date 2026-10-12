// Limiti di sicurezza: evitano richieste tipo "999999999d6"
export const MAX_COUNT = 100
export const MAX_SIDES = 1000

// Pattern: descrive la forma intera della notazione.
// (?<nome>...) dà un nome a ogni gruppo, così li leggi per nome.
const NOTATION =
  /^(?<count>\d*)d(?<sides>\d+)(?:(?<mode>kh|kl)(?<keep>\d+))?(?<mod>[+-]\d+)?$/i

export type Dice = {
  count: number
  sides: number
  mode: "kh" | "kl" | null
  keep: number | null
  modifier: number
}

export type RollResult = {
  notation: string
  rolls: number[]
  kept: number[]
  modifier: number
  total: number
}

/** Restituisce un intero tra 1 e max compresi. */
export type Rng = (max: number) => number

/** Generatore crittografico senza distorsioni (rejection sampling). */
export const cryptoRng: Rng = (max) => {
  const limit = Math.floor(0x1_0000_0000 / max) * max
  const buffer = new Uint32Array(1)
  do {
    crypto.getRandomValues(buffer)
  } while (buffer[0] >= limit)
  return (buffer[0] % max) + 1
}

export function parse(text: string): Dice {
  const match = NOTATION.exec(text.trim().replaceAll(" ", ""))
  if (!match?.groups) throw new Error(`Notazione non valida: "${text}"`)
  const g = match.groups

  // Se il conteggio manca (es. "d20"), vale 1
  const count = g.count ? Number(g.count) : 1
  const sides = Number(g.sides)
  const mode = g.mode ? (g.mode.toLowerCase() as "kh" | "kl") : null
  const keep = g.keep ? Number(g.keep) : null
  const modifier = g.mod ? Number(g.mod) : 0

  if (count < 1 || count > MAX_COUNT || sides < 2 || sides > MAX_SIDES) {
    throw new Error("Dadi o facce fuori limite")
  }
  if (keep !== null && (keep < 1 || keep > count)) {
    throw new Error(`Non puoi tenere ${keep} dadi su ${count}`)
  }

  return { count, sides, mode, keep, modifier }
}

export function format(dice: Dice): string {
  const count = dice.count === 1 ? "" : dice.count
  const keep = dice.mode ? `${dice.mode}${dice.keep}` : ""
  const mod = dice.modifier === 0 ? "" : dice.modifier > 0 ? `+${dice.modifier}` : `${dice.modifier}`
  return `${count}d${dice.sides}${keep}${mod}`
}

export function roll(dice: Dice, rng: Rng = cryptoRng): RollResult {
  // 1. Lancia tutti i dadi
  const rolls = Array.from({ length: dice.count }, () => rng(dice.sides))

  // 2. Decide quali dadi tenere: ordina dal più alto (kh) o dal più basso (kl)
  const kept =
    dice.mode === null
      ? rolls
      : [...rolls].sort((a, b) => (dice.mode === "kh" ? b - a : a - b)).slice(0, dice.keep!)

  // 3. Somma i dadi tenuti e aggiungi il modificatore
  const total = kept.reduce((sum, r) => sum + r, 0) + dice.modifier

  return { notation: format(dice), rolls, kept, modifier: dice.modifier, total }
}

/** Scorciatoia per un d20 con bonus, vantaggio o svantaggio. */
export function d20(bonus: number, advantage: "normal" | "advantage" | "disadvantage" = "normal"): Dice {
  if (advantage === "normal") return { count: 1, sides: 20, mode: null, keep: null, modifier: bonus }
  return { count: 2, sides: 20, mode: advantage === "advantage" ? "kh" : "kl", keep: 1, modifier: bonus }
}

/** Valore del d20 tenuto (per 20 e 1 naturali), oppure null se il tiro non è un singolo d20. */
export function naturalD20(notation: string, kept: number[]): number | null {
  // "d20" non seguito da altre cifre: vale per "d20+4" e "2d20kh1", non per "d200"
  return /d20(?!\d)/.test(notation) && kept.length === 1 ? kept[0] : null
}
