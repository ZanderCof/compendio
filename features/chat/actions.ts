"use server"

import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import { MAX_MESSAGE_LENGTH } from "./limits"
import { listMessagesAfter, type ChatMessageView } from "./queries"

const bodySchema = z.string().trim().min(1, "Il messaggio è vuoto").max(MAX_MESSAGE_LENGTH, "Messaggio troppo lungo")

async function isMember(campaignId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  })
  return !!membership
}

export async function sendMessage(
  campaignId: string,
  body: string
): Promise<{ ok: true; message: ChatMessageView } | { ok: false; error: string }> {
  const user = await requireUser()
  if (!(await isMember(campaignId, user.id))) return { ok: false, error: "Non fai parte di questa campagna" }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Messaggio non valido" }

  const row = await prisma.chatMessage.create({
    data: { campaignId, userId: user.id, body: parsed.data },
    select: { id: true, body: true, createdAt: true, user: { select: { id: true, name: true, image: true } } },
  })
  return { ok: true, message: { ...row, createdAt: row.createdAt.toISOString() } }
}

/** Messaggi nuovi dopo una certa data. Solo per i membri. */
export async function fetchMessagesAfter(campaignId: string, afterIso: string): Promise<ChatMessageView[]> {
  const user = await requireUser()
  if (!(await isMember(campaignId, user.id))) return []
  const after = new Date(afterIso)
  if (Number.isNaN(after.getTime())) return []
  return listMessagesAfter(campaignId, after)
}
