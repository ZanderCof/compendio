// Accesso dei nuovi utenti durante la beta. Riceve il client Prisma come parametro:
// lo usano l'hook di Better Auth, lo script da terminale e i test (anche con un DB vero).
// Niente "server-only" qui: lo script gira con Node fuori da Next.
import type { PrismaClient } from "@prisma/client"

import { checkInvite, maskCode } from "./rules"

type Db = Pick<PrismaClient, "inviteCode" | "campaign" | "invitation" | "accessRequest" | "$transaction">

/** Stato del codice, senza consumarlo: per la pagina di benvenuto. */
export async function inviteStatus(db: Db, code: string, now = new Date()) {
  const invite = await db.inviteCode.findUnique({
    where: { code },
    select: { maxUses: true, uses: true, expiresAt: true, revokedAt: true },
  })
  return checkInvite(invite, now)
}

/**
 * Consuma un uso del codice. L'updateMany è condizionato su uses < maxUses (oltre a revoca e scadenza):
 * se due registrazioni arrivano insieme sull'ultimo uso, Postgres ne aggiorna una sola e l'altra trova count = 0.
 * Ritorna l'id del codice, oppure null se non era più valido.
 */
export async function consumeInvite(db: Db, code: string, now = new Date()): Promise<string | null> {
  return db.$transaction(async (tx) => {
    const invite = await tx.inviteCode.findUnique({ where: { code }, select: { id: true, maxUses: true } })
    if (!invite) return null
    const { count } = await tx.inviteCode.updateMany({
      where: {
        id: invite.id,
        revokedAt: null,
        uses: { lt: invite.maxUses },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: { uses: { increment: 1 } },
    })
    return count === 1 ? invite.id : null
  })
}

export type AdmissionInput = {
  email: string
  /** Email degli admin (ADMIN_EMAILS): entrano sempre, anche a database vuoto */
  adminEmails?: string[]
  /** Codice dal cookie di /invite/[code] */
  betaCode?: string | null
  /** Codice campagna dal cookie di /join/[code] */
  joinCode?: string | null
}

export type Admission =
  | { allowed: true; via: "beta"; inviteCodeId: string }
  | { allowed: true; via: "join" | "email" | "request" | "admin" }
  | { allowed: false }

/**
 * Un nuovo utente può registrarsi se ha (in quest'ordine): un invito alla beta ancora valido,
 * il link di una campagna esistente, un invito via email in attesa per il suo indirizzo,
 * oppure una richiesta di accesso approvata da un admin. Gli admin entrano sempre.
 * Gli utenti già registrati non passano di qui: entrano sempre.
 */
export async function admitNewUser(db: Db, input: AdmissionInput, now = new Date()): Promise<Admission> {
  const email = input.email.toLowerCase()
  if (input.adminEmails?.includes(email)) return { allowed: true, via: "admin" }

  if (input.betaCode) {
    const inviteCodeId = await consumeInvite(db, input.betaCode, now)
    if (inviteCodeId) return { allowed: true, via: "beta", inviteCodeId }
    console.info(`[inviti] codice beta non più valido: ${maskCode(input.betaCode)}`)
  }

  if (input.joinCode) {
    const campaign = await db.campaign.findUnique({ where: { inviteCode: input.joinCode }, select: { id: true } })
    if (campaign) return { allowed: true, via: "join" }
  }

  const invitation = await db.invitation.findFirst({ where: { email, status: "PENDING" }, select: { id: true } })
  if (invitation) return { allowed: true, via: "email" }

  const request = await db.accessRequest.findFirst({ where: { email, status: "APPROVED" }, select: { id: true } })
  if (request) return { allowed: true, via: "request" }

  return { allowed: false }
}

/**
 * Chi viene bloccato lascia una richiesta di accesso, una sola per email: chi riprova aggiorna
 * tentativi, data, nome e foto. Lo stato non cambia: una richiesta rifiutata resta rifiutata.
 */
export async function recordAccessRequest(
  db: Db,
  user: { email: string; name: string; image?: string | null },
  now = new Date()
) {
  const email = user.email.toLowerCase()
  const name = user.name.trim().slice(0, 120) || email
  const image = user.image ?? null
  await db.accessRequest.upsert({
    where: { email },
    create: { email, name, image, createdAt: now, lastAttemptAt: now },
    update: { name, image, lastAttemptAt: now, attempts: { increment: 1 } },
  })
}
