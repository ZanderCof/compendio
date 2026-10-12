"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import type { FormState } from "@/features/campaigns/actions"
import { getSessionState, type SessionState } from "./queries"

const playPath = (campaignId: string) => `/campaigns/${campaignId}/play`

async function membershipOf(campaignId: string, userId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { role: true },
  })
}

/** Il giocatore segnala che è pronto (o non più) per la sessione. */
export async function setReady(campaignId: string, ready: boolean): Promise<FormState> {
  const user = await requireUser()
  const { count } = await prisma.membership.updateMany({
    where: { campaignId, userId: user.id, role: "PLAYER" },
    data: { ready },
  })
  if (count === 0) return { error: "Solo i giocatori della campagna possono dirsi pronti" }
  refresh()
}

/** Il master avvia la sessione. Se ce n'è già una in corso, la riprende. */
export async function startSession(campaignId: string): Promise<FormState> {
  const user = await requireUser()
  const membership = await membershipOf(campaignId, user.id)
  if (membership?.role !== "MASTER") return { error: "Solo il master può avviare la sessione" }

  const active = await prisma.gameSession.findFirst({ where: { campaignId, status: "ACTIVE" } })
  if (!active) {
    await prisma.gameSession.create({ data: { campaignId, startedById: user.id } })
  }
  redirect(playPath(campaignId))
}

/** Il master termina la sessione: tutti tornano "non pronti" per la prossima volta. */
export async function endSession(campaignId: string): Promise<FormState> {
  const user = await requireUser()
  const membership = await membershipOf(campaignId, user.id)
  if (membership?.role !== "MASTER") return { error: "Solo il master può terminare la sessione" }

  await prisma.$transaction([
    prisma.gameSession.updateMany({
      where: { campaignId, status: "ACTIVE" },
      data: { status: "ENDED", endedAt: new Date() },
    }),
    prisma.membership.updateMany({ where: { campaignId }, data: { ready: false } }),
  ])
  redirect(`/campaigns/${campaignId}`)
}

/** Stato della sessione per il riquadro che si aggiorna da solo. Solo per i membri. */
export async function fetchSessionState(campaignId: string): Promise<SessionState | null> {
  const user = await requireUser()
  if (!(await membershipOf(campaignId, user.id))) return null
  return getSessionState(campaignId, user.id)
}
