import "server-only"

import { ONLINE_WINDOW_MS } from "@/features/campaigns/group"
import { prisma } from "@/lib/prisma"

// Solo per le pagine admin: chi le chiama ha già fatto requireAdmin()

const DAY_MS = 24 * 60 * 60 * 1000

/** Contatori in cima alla pagina. */
export async function adminStats(now = new Date()) {
  const [users, online, activeWeek, pendingRequests] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now.getTime() - ONLINE_WINDOW_MS) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
    prisma.accessRequest.count({ where: { status: "PENDING" } }),
  ])
  return { users, online, activeWeek, pendingRequests }
}

export function pendingRequestCount() {
  return prisma.accessRequest.count({ where: { status: "PENDING" } })
}

/** Utenti iscritti, i più attivi in alto. Ricerca facoltativa per nome o email. */
export async function listUsers(search: string, now = new Date()) {
  const q = search.trim()
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      lastSeenAt: true,
      joinedVia: true,
      inviteCode: { select: { label: true } },
      _count: { select: { characters: true, memberships: true } },
      // Campagne in cui è master: quelle senza altri master spariscono se il profilo viene eliminato
      memberships: {
        where: { role: "MASTER" },
        select: { campaign: { select: { name: true, _count: { select: { members: { where: { role: "MASTER" } } } } } } },
      },
    },
  })
  return users.map(({ memberships, ...user }) => ({
    ...user,
    soleMasterOf: memberships.filter((m) => m.campaign._count.members === 1).map((m) => m.campaign.name),
    online: !!user.lastSeenAt && now.getTime() - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
  }))
}

/** Richieste di accesso: prima quelle in attesa, poi lo storico. */
export async function listAccessRequests() {
  const requests = await prisma.accessRequest.findMany({
    orderBy: { lastAttemptAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      status: true,
      attempts: true,
      createdAt: true,
      lastAttemptAt: true,
      decidedAt: true,
      decidedBy: { select: { name: true } },
    },
  })
  // Chi è stato approvato e ha già fatto l'accesso ha ora un account
  const registered = await prisma.user.findMany({
    where: { email: { in: requests.map((r) => r.email) } },
    select: { email: true },
  })
  const registeredEmails = new Set(registered.map((u) => u.email.toLowerCase()))
  const withAccount = requests.map((r) => ({ ...r, registered: registeredEmails.has(r.email) }))
  return {
    pending: withAccount.filter((r) => r.status === "PENDING"),
    decided: withAccount.filter((r) => r.status !== "PENDING"),
  }
}
