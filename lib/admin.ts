import "server-only"

import { notFound } from "next/navigation"

import { requireUser } from "@/lib/session"

/** Email degli admin da ADMIN_EMAILS (separate da virgole). */
export function adminEmails(env: Record<string, string | undefined> = process.env) {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.toLowerCase())
}

/** Utente admin, altrimenti 404: chi non è admin non sa nemmeno che la pagina esiste. */
export async function requireAdmin() {
  const user = await requireUser()
  if (!isAdminEmail(user.email)) notFound()
  return user
}
