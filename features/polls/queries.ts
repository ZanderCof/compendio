import "server-only"

import { prisma } from "@/lib/prisma"
import type { Answer } from "./polls"

export type PollView = {
  id: string
  options: { id: string; startsAt: string; answers: Record<string, Answer> }[]
  /** Chi deve rispondere: tutti i membri, master compreso */
  voters: { id: string; name: string; image: string | null }[]
}

/** Il sondaggio aperto della campagna, con le risposte di tutti. */
export async function getOpenPoll(campaignId: string): Promise<PollView | null> {
  const [poll, members] = await Promise.all([
    prisma.datePoll.findFirst({
      where: { campaignId, status: "OPEN" },
      select: {
        id: true,
        options: {
          orderBy: { startsAt: "asc" },
          select: { id: true, startsAt: true, votes: { select: { userId: true, answer: true } } },
        },
      },
    }),
    prisma.membership.findMany({
      where: { campaignId },
      orderBy: { joinedAt: "asc" },
      select: { user: { select: { id: true, name: true, image: true } } },
    }),
  ])
  if (!poll) return null

  return {
    id: poll.id,
    options: poll.options.map((option) => ({
      id: option.id,
      startsAt: option.startsAt.toISOString(),
      answers: Object.fromEntries(option.votes.map((v) => [v.userId, v.answer])),
    })),
    voters: members.map((m) => m.user),
  }
}

/**
 * Campagne con un sondaggio aperto a cui l'utente non ha ancora risposto del tutto:
 * servono per il pallino nella navbar e nella lista delle campagne.
 */
export async function campaignsAwaitingVote(userId: string): Promise<string[]> {
  const polls = await prisma.datePoll.findMany({
    where: { status: "OPEN", campaign: { members: { some: { userId } } } },
    select: {
      campaignId: true,
      options: { select: { votes: { where: { userId }, select: { id: true } } } },
    },
  })
  return polls.filter((p) => p.options.some((o) => o.votes.length === 0)).map((p) => p.campaignId)
}

/** Data della prossima sessione, solo se è ancora nel futuro. */
export async function getUpcomingSession(campaignId: string): Promise<Date | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { nextSessionAt: true },
  })
  const date = campaign?.nextSessionAt
  return date && date.getTime() > Date.now() ? date : null
}
