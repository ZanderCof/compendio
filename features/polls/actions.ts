"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import type { FormState } from "@/features/campaigns/actions"
import { pollDatesSchema } from "./polls"

async function roleIn(campaignId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { role: true },
  })
  return membership?.role ?? null
}

/** Il master propone le date. Se c'era già un sondaggio aperto, viene sostituito. */
export async function createPoll(campaignId: string, isoDates: string[]): Promise<FormState> {
  const user = await requireUser()
  if ((await roleIn(campaignId, user.id)) !== "MASTER") return { error: "Solo il master può proporre le date" }

  const parsed = pollDatesSchema().safeParse(isoDates)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date non valide" }

  await prisma.$transaction([
    prisma.datePoll.deleteMany({ where: { campaignId, status: "OPEN" } }),
    prisma.datePoll.create({
      data: {
        campaignId,
        createdById: user.id,
        options: { create: parsed.data.map((startsAt) => ({ startsAt })) },
      },
    }),
  ])
  refresh()
}

/** Un membro risponde per una data: sì, forse o no. Si può cambiare idea finché il sondaggio è aperto. */
export async function vote(optionId: string, answer: unknown): Promise<FormState> {
  const user = await requireUser()
  const parsed = z.enum(["YES", "MAYBE", "NO"]).safeParse(answer)
  if (!parsed.success) return { error: "Risposta non valida" }

  const option = await prisma.dateOption.findFirst({
    where: { id: optionId, poll: { status: "OPEN", campaign: { members: { some: { userId: user.id } } } } },
    select: { id: true },
  })
  if (!option) return { error: "Sondaggio chiuso o non trovato" }

  await prisma.dateVote.upsert({
    where: { optionId_userId: { optionId, userId: user.id } },
    create: { optionId, userId: user.id, answer: parsed.data },
    update: { answer: parsed.data },
  })
  refresh()
}

/** Il master sceglie la data: diventa la prossima sessione della campagna e il sondaggio si chiude. */
export async function chooseDate(optionId: string): Promise<FormState> {
  const user = await requireUser()
  const option = await prisma.dateOption.findFirst({
    where: {
      id: optionId,
      poll: { status: "OPEN", campaign: { members: { some: { userId: user.id, role: "MASTER" } } } },
    },
    select: { startsAt: true, poll: { select: { id: true, campaignId: true } } },
  })
  if (!option) return { error: "Solo il master può scegliere la data" }

  await prisma.$transaction([
    prisma.datePoll.update({
      where: { id: option.poll.id },
      data: { status: "CLOSED", closedAt: new Date() },
    }),
    prisma.campaign.update({
      where: { id: option.poll.campaignId },
      data: { nextSessionAt: option.startsAt },
    }),
  ])
  refresh()
}

/** Il master annulla il sondaggio senza scegliere. */
export async function cancelPoll(pollId: string): Promise<FormState> {
  const user = await requireUser()
  const { count } = await prisma.datePoll.deleteMany({
    where: { id: pollId, status: "OPEN", campaign: { members: { some: { userId: user.id, role: "MASTER" } } } },
  })
  if (count === 0) return { error: "Solo il master può annullare il sondaggio" }
  refresh()
}
