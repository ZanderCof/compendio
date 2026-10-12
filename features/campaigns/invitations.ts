"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import type { FormState } from "./actions"

const emailSchema = z.email("Email non valida").transform((e) => e.trim().toLowerCase())

async function isMaster(campaignId: string, userId: string) {
  const membership = await prisma.membership.findFirst({ where: { campaignId, userId, role: "MASTER" } })
  return !!membership
}

/** Il master invita una persona con l'email del suo account Google. Reinvitare chi ha rifiutato lo rimette in attesa. */
export async function inviteByEmail(campaignId: string, rawEmail: string): Promise<FormState> {
  const user = await requireUser()
  if (!(await isMaster(campaignId, user.id))) return { error: "Solo il master può invitare" }

  const parsed = emailSchema.safeParse(rawEmail.trim())
  if (!parsed.success) return { error: "Email non valida" }
  const email = parsed.data

  const alreadyMember = await prisma.membership.findFirst({
    where: { campaignId, user: { email: { equals: email, mode: "insensitive" } } },
  })
  if (alreadyMember) return { error: "Questa persona fa già parte della campagna" }

  await prisma.invitation.upsert({
    where: { campaignId_email: { campaignId, email } },
    create: { campaignId, email, invitedById: user.id },
    update: { status: "PENDING", respondedAt: null, invitedById: user.id, createdAt: new Date() },
  })
  refresh()
}

/** Il master ritira un invito (in attesa o rifiutato). */
export async function cancelInvitation(invitationId: string): Promise<FormState> {
  const user = await requireUser()
  const { count } = await prisma.invitation.deleteMany({
    where: {
      id: invitationId,
      status: { not: "ACCEPTED" },
      campaign: { members: { some: { userId: user.id, role: "MASTER" } } },
    },
  })
  if (count === 0) return { error: "Invito non trovato" }
  refresh()
}

/** L'invitato accetta (diventa giocatore) o rifiuta. Vale solo per l'email del suo account. */
export async function respondToInvitation(invitationId: string, accept: boolean): Promise<FormState> {
  const user = await requireUser()
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, status: "PENDING", email: user.email.toLowerCase() },
    select: { campaignId: true },
  })
  if (!invitation) return { error: "Invito non trovato o già gestito" }

  if (!accept) {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "DECLINED", respondedAt: new Date() },
    })
    refresh()
    return
  }

  await prisma.$transaction([
    prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    prisma.membership.upsert({
      where: { userId_campaignId: { userId: user.id, campaignId: invitation.campaignId } },
      create: { userId: user.id, campaignId: invitation.campaignId, role: "PLAYER" },
      update: {},
    }),
  ])
  redirect(`/campaigns/${invitation.campaignId}`)
}

/** Rifiuto dal link di invito: si registra così il master vede chi ha detto di no. */
export async function declineInviteLink(code: string): Promise<FormState> {
  const user = await requireUser()
  const campaign = await prisma.campaign.findUnique({ where: { inviteCode: code }, select: { id: true } })
  if (!campaign) return { error: "Invito non valido" }

  const email = user.email.toLowerCase()
  const member = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
  })
  if (!member) {
    const invitedBy = await prisma.membership.findFirst({
      where: { campaignId: campaign.id, role: "MASTER" },
      select: { userId: true },
    })
    if (invitedBy) {
      await prisma.invitation.upsert({
        where: { campaignId_email: { campaignId: campaign.id, email } },
        create: {
          campaignId: campaign.id,
          email,
          invitedById: invitedBy.userId,
          status: "DECLINED",
          respondedAt: new Date(),
        },
        update: { status: "DECLINED", respondedAt: new Date() },
      })
    }
  }
  redirect("/campaigns")
}
