// Regole per le immagini delle mappe, condivise da browser e server.

export const MAP_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const MAP_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const MAP_IMAGE_MAX_SIDE = 12_000

export type UploadMode = "blob" | "local"

/** Dove si caricano le immagini: Vercel Blob se c'è il token, altrimenti la cartella locale (solo sviluppo). */
export function uploadMode(): UploadMode | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob"
  return process.env.NODE_ENV === "production" ? null : "local"
}

/** Gli URL accettati per lo sfondo: il nostro Blob store o la cartella locale di sviluppo. */
export function isAllowedImageUrl(url: string) {
  if (url.startsWith("/uploads/maps/")) return /^\/uploads\/maps\/[\w-]+\.(jpg|png|webp)$/.test(url)
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

/** Riconosce jpg, png e webp dai primi byte del file, senza fidarsi del nome o del tipo dichiarato. */
export function sniffImageType(bytes: Uint8Array): (typeof MAP_IMAGE_TYPES)[number] | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg"
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png"
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp"
  }
  return null
}
