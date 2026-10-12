import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

// Controllo veloce: se manca il cookie di sessione rimanda al login.
// Non verifica che la sessione sia valida: quello lo fa requireUser() nelle pagine.
// AUTH_DISABLED=true in .env salta il login durante lo sviluppo. In produzione è sempre ignorato.
const authDisabled =
  process.env.AUTH_DISABLED === "true" && process.env.NODE_ENV !== "production"

export function proxy(request: NextRequest) {
  if (authDisabled) return NextResponse.next()

  // La home è pubblica
  if (request.nextUrl.pathname === "/") return NextResponse.next()

  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  // Tutto tranne login, API di autenticazione e file statici
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|otf|woff2?)$).*)"],
}
