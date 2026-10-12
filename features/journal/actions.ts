"use server"

import { refresh } from "next/cache"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import type { FormState } from "@/features/campaigns/actions"
import {
  canDeleteEntry,
  canEditEntry,
  canWriteScope,
  journalEntrySchema,
  type JournalEntryInput,
  type JournalScope,
} from "./journal"

async function viewerIn(campaignId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { role: true },
  })
  return membership ? { userId, isMaster: membership.role === "MASTER" } : null
}

export async function createJournalEntry(
  campaignId: string,
  scope: JournalScope,
  input: JournalEntryInput
): Promise<FormState> {
  const user = await requireUser()
  const viewer = await viewerIn(campaignId, user.id)
  if (!viewer || !canWriteScope(scope, viewer)) return { error: "Non puoi scrivere in questo diario" }

  const parsed = journalEntrySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Voce non valida" }

  await prisma.journalEntry.create({
    data: { ...parsed.data, scope, campaignId, authorId: user.id },
  })
  refresh()
}

async function loadEntry(entryId: string) {
  return prisma.journalEntry.findUnique({
    where: { id: entryId },
    select: { campaignId: true, scope: true, authorId: true },
  })
}

export async function updateJournalEntry(entryId: string, input: JournalEntryInput): Promise<FormState> {
  const user = await requireUser()
  const entry = await loadEntry(entryId)
  const viewer = entry && (await viewerIn(entry.campaignId, user.id))
  if (!entry || !viewer || !canEditEntry(entry, viewer)) return { error: "Non puoi modificare questa voce" }

  const parsed = journalEntrySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Voce non valida" }

  await prisma.journalEntry.update({ where: { id: entryId }, data: parsed.data })
  refresh()
}

export async function deleteJournalEntry(entryId: string): Promise<FormState> {
  const user = await requireUser()
  const entry = await loadEntry(entryId)
  const viewer = entry && (await viewerIn(entry.campaignId, user.id))
  if (!entry || !viewer || !canDeleteEntry(entry, viewer)) return { error: "Non puoi cancellare questa voce" }

  await prisma.journalEntry.delete({ where: { id: entryId } })
  refresh()
}
