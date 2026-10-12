import "server-only"

import { z } from "zod"

import { prisma } from "@/lib/prisma"
import type { SheetChange } from "@/features/characters/diff"

export const changesSchema = z.array(
  z.object({ path: z.string().min(1), from: z.json(), to: z.json() })
) as unknown as z.ZodType<SheetChange[]>

export type EditRequestView = {
  id: string
  message: string | null
  createdAt: string
  requestedBy: { id: string; name: string; image: string | null }
  changes: SheetChange[]
}

/** Proposte in attesa per un personaggio, dalla più vecchia. */
export async function listPendingRequests(characterId: string): Promise<EditRequestView[]> {
  const rows = await prisma.editRequest.findMany({
    where: { characterId, status: "PENDING" },
    select: {
      id: true,
      message: true,
      createdAt: true,
      changes: true,
      requestedBy: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  })
  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    requestedBy: row.requestedBy,
    // Se una riga fosse rovinata si mostra vuota invece di rompere la pagina
    changes: changesSchema.safeParse(row.changes).data ?? [],
  }))
}
