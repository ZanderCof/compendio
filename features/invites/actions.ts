"use server"

import { cookies, headers } from "next/headers"
import { refresh } from "next/cache"
import { z } from "zod"

import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { clientIp, rateLimit } from "@/lib/rateLimit"
import { inviteStatus } from "./admission"
import {
  BETA_INVITE_COOKIE,
  generateInviteCode,
  inviteCookieOptions,
  isPlausibleCode,
  maskCode,
} from "./rules"

/**
 * Clic su "Accedi con Google" nella pagina dell'invito: ricontrolla il codice e lo salva in un cookie
 * httpOnly per 30 minuti. Il cookie contiene solo il codice; al momento della registrazione
 * l'hook di Better Auth lo verifica di nuovo e lo consuma.
 */
export async function acceptBetaInvite(code: string): Promise<boolean> {
  if (!rateLimit(`invite:${clientIp(await headers())}`, 20, 60_000)) return false
  if (!isPlausibleCode(code) || (await inviteStatus(prisma, code)) !== "valid") {
    console.info(`[inviti] codice rifiutato al clic: ${maskCode(code)}`)
    return false
  }
  ;(await cookies()).set(BETA_INVITE_COOKIE, code, inviteCookieOptions)
  return true
}

export type InviteFormState = { error?: string; code?: string } | undefined

const createSchema = z.object({
  label: z.string().trim().min(1, "Scrivi un'etichetta").max(80, "Etichetta troppo lunga"),
  maxUses: z.coerce.number().int().min(1, "Almeno 1 uso").max(500, "Massimo 500 usi"),
  // Data dal campo <input type="date">: scade alla fine di quel giorno
  expiresOn: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(`${v}T23:59:59`) : null))
    .refine((d) => d === null || (!Number.isNaN(d.getTime()) && d > new Date()), "La scadenza deve essere futura"),
})

/** Nuovo codice d'invito. Solo admin (controllo lato server). */
export async function createInvite(_prev: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const admin = await requireAdmin()
  const parsed = createSchema.safeParse({
    label: formData.get("label") ?? "",
    maxUses: formData.get("maxUses") ?? 1,
    expiresOn: formData.get("expiresOn") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" }

  const code = generateInviteCode()
  await prisma.inviteCode.create({
    data: {
      code,
      label: parsed.data.label,
      maxUses: parsed.data.maxUses,
      expiresAt: parsed.data.expiresOn,
      createdById: admin.id,
    },
  })
  refresh()
  return { code }
}

/** Revoca un codice: i link smettono di funzionare, chi si è già registrato resta. Solo admin. */
export async function revokeInvite(id: string): Promise<InviteFormState> {
  await requireAdmin()
  const { count } = await prisma.inviteCode.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (count === 0) return { error: "Codice non trovato o già revocato" }
  refresh()
}
