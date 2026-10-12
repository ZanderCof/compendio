"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"

// Non scrive più spesso di così, anche se il browser chiama più volte
const MIN_INTERVAL_MS = 30_000

/** Il browser segnala che il sito è aperto: aggiorna l'ultimo accesso dell'utente. */
export async function heartbeat(): Promise<void> {
  const session = await getSession()
  if (!session) return
  const threshold = new Date(Date.now() - MIN_INTERVAL_MS)
  await prisma.user.updateMany({
    where: {
      id: session.user.id,
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: threshold } }],
    },
    data: { lastSeenAt: new Date() },
  })
}
