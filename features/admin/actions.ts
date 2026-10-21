"use server"

import { refresh } from "next/cache"

import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export type AdminActionState = { error?: string } | undefined

/**
 * Approva o rifiuta una richiesta di accesso. Solo admin (controllo lato server).
 * Approvata: al prossimo accesso con Google la persona entra. Rifiutata: resta bloccata
 * (e chi riprova non riapre la richiesta), ma si può sempre approvare in seguito.
 */
export async function decideAccessRequest(id: string, approve: boolean): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const { count } = await prisma.accessRequest.updateMany({
    where: { id },
    data: { status: approve ? "APPROVED" : "REJECTED", decidedAt: new Date(), decidedById: admin.id },
  })
  if (count === 0) return { error: "Richiesta non trovata" }
  refresh()
}
