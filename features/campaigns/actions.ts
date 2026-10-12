"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"

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

  await prisma.membership.upsert({
    where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
    create: { userId: user.id, campaignId: campaign.id, role: "PLAYER" },
    update: {},
  })
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
