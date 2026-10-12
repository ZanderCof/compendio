"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import { getCampaignGroup, type GroupEntry } from "./group"

export type FormState = { error?: string } | undefined

const campaignSchema = z.object({
  name: z.string().trim().min(1, "Dai un nome alla campagna").max(80),
  description: z.string().trim().max(500).optional(),
})

/** Crea la campagna: chi la crea ne è il master. */
export async function createCampaign(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser()
  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const campaign = await prisma.campaign.create({
    data: {
      ...parsed.data,
      members: { create: { userId: user.id, role: "MASTER" } },
    },
    select: { id: true },
  })
  redirect(`/campaigns/${campaign.id}`)
}

/** Entra in una campagna con il codice invito. Se ci sei già, porta direttamente alla campagna. */
export async function joinCampaign(code: string): Promise<FormState> {
  const user = await requireUser()
  const campaign = await prisma.campaign.findUnique({
    where: { inviteCode: code.trim() },
    select: { id: true },
  })
  if (!campaign) return { error: "Codice invito non valido o scaduto" }

  await prisma.$transaction([
    prisma.membership.upsert({
      where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
      create: { userId: user.id, campaignId: campaign.id, role: "PLAYER" },
      update: {},
    }),
    // Se il master l'aveva anche invitato per email, l'invito risulta accettato
    prisma.invitation.updateMany({
      where: { campaignId: campaign.id, email: user.email.toLowerCase(), status: { not: "ACCEPTED" } },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
  ])
  redirect(`/campaigns/${campaign.id}`)
}

/** Accetta sia il codice sia il link completo incollato dal master. */
export async function joinCampaignFromForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = String(formData.get("code") ?? "").trim()
  const code = raw.split("/join/").pop()?.split(/[?#]/)[0] ?? ""
  if (!code) return { error: "Incolla il codice o il link di invito" }
  return joinCampaign(code)
}

/** Nuovo codice invito: quello vecchio smette di funzionare. Solo il master. */
export async function regenerateInviteCode(campaignId: string): Promise<FormState> {
  const user = await requireUser()
  const { count } = await prisma.campaign.updateMany({
    where: { id: campaignId, members: { some: { userId: user.id, role: "MASTER" } } },
    data: { inviteCode: crypto.randomUUID().replaceAll("-", "") },
  })
  if (count === 0) return { error: "Solo il master può cambiare il codice invito" }
  refresh()
}

/**
 * Toglie un utente dalla campagna. I suoi personaggi restano suoi ma escono dalla campagna,
 * e le proposte di modifica ancora in attesa su di loro vengono cancellate.
 * I tiri già fatti restano nel registro.
 */
async function removeFromCampaign(campaignId: string, userId: string) {
  await prisma.$transaction([
    prisma.editRequest.deleteMany({
      where: { status: "PENDING", character: { ownerId: userId, campaignId } },
    }),
    prisma.character.updateMany({ where: { ownerId: userId, campaignId }, data: { campaignId: null } }),
    prisma.membership.delete({ where: { userId_campaignId: { userId, campaignId } } }),
  ])
}

/** Il master rimuove un giocatore. Non può rimuovere se stesso. */
export async function removeMember(campaignId: string, memberId: string): Promise<FormState> {
  const user = await requireUser()
  if (memberId === user.id) return { error: "Non puoi rimuovere te stesso" }

  const [master, member] = await Promise.all([
    prisma.membership.findFirst({ where: { campaignId, userId: user.id, role: "MASTER" } }),
    prisma.membership.findUnique({ where: { userId_campaignId: { userId: memberId, campaignId } } }),
  ])
  if (!master) return { error: "Solo il master può rimuovere i giocatori" }
  if (!member) return { error: "Questo utente non fa più parte della campagna" }
  if (member.role === "MASTER") return { error: "Non puoi rimuovere un altro master" }

  await removeFromCampaign(campaignId, memberId)
  refresh()
}

/** Un giocatore esce dalla campagna. Il master no: la campagna resterebbe senza master. */
export async function leaveCampaign(campaignId: string): Promise<FormState> {
  const user = await requireUser()
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: user.id, campaignId } },
  })
  if (!membership) return { error: "Non fai parte di questa campagna" }
  if (membership.role === "MASTER") return { error: "Il master non può uscire dalla sua campagna" }

  await removeFromCampaign(campaignId, user.id)
  redirect("/campaigns")
}

/** Il gruppo aggiornato, per la lista che si rinfresca da sola. Solo per i membri. */
export async function fetchCampaignGroup(campaignId: string): Promise<GroupEntry[]> {
  const user = await requireUser()
  const member = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: user.id, campaignId } },
  })
  if (!member) return []
  return getCampaignGroup(campaignId, user.id)
}
