import "server-only"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"

/** Sessione corrente, oppure null se l'utente non ha fatto l'accesso. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * Utente corrente: se non c'è una sessione valida rimanda al login.
 * Da usare in pagine e Server Actions: il proxy fa solo un controllo veloce sul cookie.
 */
export async function requireUser() {
  const session = await getSession()
  if (!session) redirect("/login")
  return session.user
}
