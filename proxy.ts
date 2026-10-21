import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

import { inviteCookieOptions, isPlausibleCode, JOIN_INVITE_COOKIE } from "@/features/invites/rules"

// Controllo veloce: se manca il cookie di sessione rimanda al login.
// Non verifica che la sessione sia valida: quello lo fa requireUser() nelle pagine.
// AUTH_DISABLED=true in .env salta il login durante lo sviluppo. In produzione è sempre ignorato.
const authDisabled =
  process.env.AUTH_DISABLED === "true" && process.env.NODE_ENV !== "production"

export function proxy(request: NextRequest) {
  if (authDisabled) return NextResponse.next()

  const { pathname } = request.nextUrl
  // Pubbliche: la home e le pagine degli inviti alla beta
  if (pathname === "/" || pathname.startsWith("/invite/") || pathname === "/accesso-su-invito") {
    return NextResponse.next()
  }

  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", pathname)
    const response = NextResponse.redirect(login)
    // Link di una campagna aperto da chi non ha fatto l'accesso: con la beta su invito,
    // il codice gli permette di registrarsi. Il cookie contiene solo il codice, lo verifica il server.
    const join = /^\/join\/([^/]+)$/.exec(pathname)?.[1]
    if (join && isPlausibleCode(join)) response.cookies.set(JOIN_INVITE_COOKIE, join, inviteCookieOptions)
    return response
  }
  return NextResponse.next()
}

export const config = {
  // Tutto tranne login, API di autenticazione e file statici
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|otf|woff2?)$).*)"],
}
