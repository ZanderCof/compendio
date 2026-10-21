import { APIError } from "better-auth/api"

import { prisma } from "@/lib/prisma"
import { admitNewUser, recordAccessRequest } from "./admission"
import { BETA_INVITE_COOKIE, INVITE_REQUIRED_ERROR, isInviteOnly, JOIN_INVITE_COOKIE } from "./rules"

/** La parte del contesto di Better Auth che serve qui: leggere e cancellare i cookie. */
export type CookieContext = {
  getCookie: (key: string) => string | null
  setCookie: (key: string, value: string, options?: { maxAge?: number; path?: string }) => string
}

/**
 * Hook di Better Auth prima di creare un utente (solo i nuovi: chi è già registrato non passa di qui).
 * Con INVITE_ONLY spento non fa nulla. Altrimenti serve un invito valido, o l'utente non viene creato
 * e Better Auth rimanda a /accesso-su-invito?error=invite_required. In quel caso resta una richiesta di accesso.
 */
export async function beforeUserCreate(
  user: { email: string; name?: string | null; image?: string | null },
  ctx: CookieContext | null
) {
  if (!isInviteOnly()) return

  const admission = await admitNewUser(prisma, {
    email: user.email,
    betaCode: ctx?.getCookie(BETA_INVITE_COOKIE),
    joinCode: ctx?.getCookie(JOIN_INVITE_COOKIE),
  })

  if (!admission.allowed) {
    // L'admin la vede in /admin e può approvarla: al prossimo accesso la persona entra
    await recordAccessRequest(prisma, { email: user.email, name: user.name ?? "", image: user.image }).catch(() =>
      console.error("[inviti] impossibile salvare la richiesta di accesso")
    )
    throw new APIError("FORBIDDEN", { code: INVITE_REQUIRED_ERROR, message: "Registrazione solo su invito" })
  }

  if (admission.via === "beta") {
    // Il codice è consumato: il cookie non serve più
    ctx?.setCookie(BETA_INVITE_COOKIE, "", { maxAge: 0, path: "/" })
    return { data: { inviteCodeId: admission.inviteCodeId, joinedVia: "beta" } }
  }
  return { data: { joinedVia: admission.via } }
}
