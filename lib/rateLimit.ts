import "server-only"

// Limite leggero in memoria, per finestra fissa. Vale per singola istanza del server:
// basta a frenare i tentativi a tappeto, non è una protezione distribuita.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    // Pulizia occasionale: la mappa non cresce all'infinito
    if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  bucket.count++
  return bucket.count <= limit
}

/** IP del client dagli header del proxy (Vercel imposta x-forwarded-for). */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "sconosciuto"
}
