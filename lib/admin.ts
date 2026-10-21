import "server-only"

import { notFound } from "next/navigation"

import { adminEmails } from "@/lib/adminEmails"
import { requireUser } from "@/lib/session"

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.toLowerCase())
}

/** Utente admin, altrimenti 404: chi non è admin non sa nemmeno che la pagina esiste. */
export async function requireAdmin() {
  const user = await requireUser()
  if (!isAdminEmail(user.email)) notFound()
  return user
}
