"use server"

import { refresh } from "next/cache"

import { isAdminEmail, requireAdmin } from "@/lib/admin"
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

/**
 * Elimina un profilo e tutto ciò che è suo (personaggi, iscrizioni, tiri, diario… vanno via a cascata).
 * Anche le campagne in cui era l'unico master: senza master non le potrebbe più gestire nessuno.
 * La sua richiesta di accesso sparisce: per rientrare con la beta su invito serve un nuovo invito.
 * Solo admin; non si può eliminare sé stessi né un altro admin.
 */
export async function deleteUserProfile(userId: string): Promise<AdminActionState> {
  const admin = await requireAdmin()
  if (userId === admin.id) return { error: "Non puoi eliminare il tuo profilo da qui" }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (!user) return { error: "Utente non trovato" }
  if (isAdminEmail(user.email)) return { error: "Non puoi eliminare un altro admin" }

  await prisma.$transaction(async (tx) => {
    const soleMaster = await tx.campaign.findMany({
      where: {
        members: { some: { userId, role: "MASTER" } },
        NOT: { members: { some: { userId: { not: userId }, role: "MASTER" } } },
      },
      select: { id: true },
    })
    await tx.campaign.deleteMany({ where: { id: { in: soleMaster.map((c) => c.id) } } })
    await tx.accessRequest.deleteMany({ where: { email: user.email.toLowerCase() } })
    await tx.user.delete({ where: { id: userId } })
  })
  console.info("[admin] profilo eliminato")
  refresh()
}
