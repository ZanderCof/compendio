import { upload } from "@vercel/blob/client"

import { MAP_IMAGE_MAX_BYTES, MAP_IMAGE_TYPES, type UploadMode } from "@/features/maps/upload"

/** Errore di caricamento con un messaggio già pronto da mostrare (in italiano). */
export class UploadError extends Error {}

/** Controlli rapidi nel browser: il server li ripete comunque. */
export function checkImageFile(file: File): string | null {
  if (!(MAP_IMAGE_TYPES as readonly string[]).includes(file.type)) return "Sono accettate solo immagini jpg, png o webp"
  if (file.size > MAP_IMAGE_MAX_BYTES) return "L'immagine supera i 10 MB"
  return null
}

/** Larghezza e altezza reali dell'immagine, lette nel browser prima di caricarla. */
export async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    // Il browser non riesce a leggerla: file rovinato o non è davvero un'immagine
    throw new UploadError("Il file non è un'immagine valida o è danneggiato")
  }
}

/** Qualsiasi errore di caricamento diventa un messaggio in italiano. */
export function uploadErrorMessage(error: unknown): string {
  if (error instanceof UploadError) return error.message
  const text = error instanceof Error ? error.message : ""
  if (/size|large|exceed/i.test(text)) return "L'immagine supera i 10 MB"
  if (/content.?type|not allowed|type/i.test(text)) return "Sono accettate solo immagini jpg, png o webp"
  if (/network|fetch|failed to fetch/i.test(text)) return "Connessione assente: riprova tra poco"
  if (/master/i.test(text)) return "Solo il master può caricare mappe"
  return "Caricamento non riuscito, riprova"
}

/** Carica l'immagine e restituisce l'URL da salvare sulla mappa. */
export async function uploadMapImage(file: File, campaignId: string, mode: UploadMode): Promise<string> {
  if (mode === "blob") {
    // Il browser carica direttamente su Vercel Blob: il server rilascia solo il permesso
    const blob = await upload(`maps/${campaignId}/${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/maps/upload",
      clientPayload: JSON.stringify({ campaignId }),
    })
    return blob.url
  }

  const form = new FormData()
  form.set("file", file)
  form.set("campaignId", campaignId)
  const response = await fetch("/api/maps/upload", { method: "POST", body: form })
  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
  // Gli errori del nostro server sono già in italiano
  if (!response.ok || !data.url) throw new UploadError(data.error ?? "Caricamento non riuscito, riprova")
  return data.url
}
