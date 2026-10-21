// Copertina generata dal nome della campagna: sempre la stessa per lo stesso nome, senza immagini.

const PALETTE = ["#AA3E98", "#9368B7", "#9297C4", "#84C7D0", "#75DDDD"] as const

/** Hash FNV-1a a 32 bit: veloce e stabile tra server e browser. */
function hash(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Iniziali delle prime due parole significative ("La Miniera Perduta" → "MP"). */
export function campaignInitials(name: string) {
  const skip = new Set(["il", "lo", "la", "i", "gli", "le", "l", "un", "una", "di", "del", "della", "dei", "the", "of"])
  const words = name
    .split(/[\s'’-]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
  const meaningful = words.filter((w) => !skip.has(w.toLowerCase()))
  const picked = (meaningful.length > 0 ? meaningful : words).slice(0, 2)
  return picked.map((w) => w[0]!.toUpperCase()).join("") || "?"
}

export type CampaignCover = { from: string; to: string; angle: number; pattern: number; initials: string }

/** Due colori diversi della palette, un angolo e uno dei motivi di sfondo, scelti dal nome. */
export function campaignCover(name: string): CampaignCover {
  const h = hash(name.trim().toLowerCase())
  const first = h % PALETTE.length
  const second = (first + 1 + ((h >>> 3) % (PALETTE.length - 1))) % PALETTE.length
  return {
    from: PALETTE[first]!,
    to: PALETTE[second]!,
    angle: 90 + ((h >>> 7) % 8) * 22.5,
    pattern: (h >>> 11) % 3,
    initials: campaignInitials(name),
  }
}
