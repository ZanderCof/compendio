// Regole pure degli inviti alla beta: niente DB, così si testano da sole.
// Questo file lo importa anche il proxy: niente dipendenze dal server.

/** Cookie con il codice dell'invito alla beta (/invite/[code]). Contiene solo il codice. */
export const BETA_INVITE_COOKIE = "compendio_invite"
/** Cookie con il codice di una campagna (/join/[code]) per chi non è ancora registrato. */
export const JOIN_INVITE_COOKIE = "compendio_join"
/** Durata dei due cookie: il tempo di fare l'accesso con Google. */
export const INVITE_COOKIE_MAX_AGE = 30 * 60

/** Errore che Better Auth passa a /accesso-su-invito quando un nuovo utente non ha un invito. */
export const INVITE_REQUIRED_ERROR = "invite_required"

export const inviteCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: INVITE_COOKIE_MAX_AGE,
} as const

export type InviteState = {
  maxUses: number
  uses: number
  expiresAt: Date | null
  revokedAt: Date | null
}

export type InviteStatus = "valid" | "expired" | "revoked" | "exhausted" | "missing"

/** Esiste, non è revocato, non è scaduto e ha ancora usi. */
export function checkInvite(invite: InviteState | null, now: Date): InviteStatus {
  if (!invite) return "missing"
  if (invite.revokedAt) return "revoked"
  if (invite.expiresAt && invite.expiresAt <= now) return "expired"
  if (invite.uses >= invite.maxUses) return "exhausted"
  return "valid"
}

/** Codice casuale url-safe: 32 byte (256 bit) in base64url, 43 caratteri. */
export function generateInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Buffer.from(bytes).toString("base64url")
}

/** Forma accettata per un codice: evita query inutili con input strani. */
export function isPlausibleCode(code: string) {
  return /^[A-Za-z0-9_-]{16,64}$/.test(code)
}

/** Nei log il codice compare solo troncato. */
export function maskCode(code: string) {
  return `${code.slice(0, 6)}…`
}

/** Il flag della beta: solo "true" la attiva. Se manca, la registrazione è libera. */
export function isInviteOnly(env: Record<string, string | undefined> = process.env) {
  return env.INVITE_ONLY === "true"
}
