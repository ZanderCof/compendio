"use server"

import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import { applyChanges, changeLabel, diffSheets } from "@/features/characters/diff"
import { characterSheetSchema } from "@/features/characters/schema"
import type { CharacterSheet } from "@/features/characters/types"
import { changesSchema, listPendingRequests, type EditRequestView } from "./queries"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

/** Il personaggio con il suo proprietario e il master della campagna (se c'è). */
async function loadCharacter(characterId: string) {
  return prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      sheet: true,
      ownerId: true,
      campaign: { select: { members: { where: { role: "MASTER" }, select: { userId: true } } } },
    },
  })
}

const isMasterOf = (character: NonNullable<Awaited<ReturnType<typeof loadCharacter>>>, userId: string) =>
  character.campaign?.members.some((m) => m.userId === userId) ?? false

/**
 * Il master propone delle modifiche. Il client manda la scheda da cui è partito e quella modificata:
 * il server calcola le differenze, così "from" è il valore che il master aveva davanti.
 */
export async function proposeChanges(
  characterId: string,
  baseSheet: unknown,
  proposedSheet: unknown,
  message: string
): Promise<Result<{ requests: EditRequestView[] }>> {
  const user = await requireUser()
  const character = await loadCharacter(characterId)
  if (!character || !isMasterOf(character, user.id)) {
    return { ok: false, error: "Solo il master della campagna può proporre modifiche" }
  }

  const base = characterSheetSchema.safeParse(baseSheet)
  const proposed = characterSheetSchema.safeParse(proposedSheet)
  if (!base.success || !proposed.success) return { ok: false, error: "Scheda non valida" }

  const changes = diffSheets(base.data, proposed.data)
  if (changes.length === 0) return { ok: false, error: "Non hai cambiato nulla" }

  await prisma.editRequest.create({
    data: {
      characterId,
      requestedById: user.id,
      changes,
      message: z.string().trim().max(500).parse(message) || null,
    },
  })
  return { ok: true, requests: await listPendingRequests(characterId) }
}

/** Il master ritira una sua proposta ancora in attesa. */
export async function cancelRequest(requestId: string): Promise<Result<{ requests: EditRequestView[] }>> {
  const user = await requireUser()
  const request = await prisma.editRequest.findFirst({
    where: { id: requestId, requestedById: user.id, status: "PENDING" },
    select: { characterId: true },
  })
  if (!request) return { ok: false, error: "Proposta non trovata" }

  await prisma.editRequest.delete({ where: { id: requestId } })
  return { ok: true, requests: await listPendingRequests(request.characterId) }
}

/**
 * Il giocatore accetta o rifiuta. Se accetta, le modifiche si applicano solo se i campi
 * valgono ancora quello che il master aveva visto: altrimenti nulla viene sovrascritto.
 */
export async function respondToRequest(
  requestId: string,
  accept: boolean
): Promise<Result<{ sheet: CharacterSheet | null; requests: EditRequestView[] }>> {
  const user = await requireUser()
  const request = await prisma.editRequest.findFirst({
    where: { id: requestId, status: "PENDING", character: { ownerId: user.id } },
    select: { characterId: true, changes: true },
  })
  if (!request) return { ok: false, error: "Proposta non trovata o già gestita" }

  if (!accept) {
    await prisma.editRequest.update({
      where: { id: requestId },
      data: { status: "DECLINED", resolvedAt: new Date() },
    })
    return { ok: true, sheet: null, requests: await listPendingRequests(request.characterId) }
  }

  const character = await loadCharacter(request.characterId)
  const current = characterSheetSchema.safeParse(character?.sheet)
  const changes = changesSchema.safeParse(request.changes)
  if (!character || !current.success || !changes.success) {
    return { ok: false, error: "Non riesco a leggere la scheda o la proposta" }
  }

  const applied = applyChanges(current.data, changes.data)
  if (!applied.ok) {
    const fields = applied.conflicts.map((c) => changeLabel(c.path)).join(", ")
    return {
      ok: false,
      error: `Nel frattempo hai cambiato: ${fields}. Rifiuta la proposta e chiedi al master di rifarla.`,
    }
  }

  const next = characterSheetSchema.safeParse(applied.sheet)
  if (!next.success) return { ok: false, error: "La proposta renderebbe la scheda non valida" }

  // Scheda e stato della proposta cambiano insieme, o nessuno dei due
  await prisma.$transaction([
    prisma.character.update({ where: { id: request.characterId }, data: { sheet: next.data } }),
    prisma.editRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", resolvedAt: new Date() },
    }),
  ])
  return { ok: true, sheet: next.data, requests: await listPendingRequests(request.characterId) }
}

/** Per aggiornare il banner senza ricaricare la pagina. Proprietario o master. */
export async function fetchPendingRequests(characterId: string): Promise<EditRequestView[]> {
  const user = await requireUser()
  const character = await loadCharacter(characterId)
  if (!character || (character.ownerId !== user.id && !isMasterOf(character, user.id))) return []
  return listPendingRequests(characterId)
}
