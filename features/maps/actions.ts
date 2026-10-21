"use server"

import { unlink } from "node:fs/promises"
import path from "node:path"

import { del } from "@vercel/blob"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import type { FormState } from "@/features/campaigns/actions"
import { normalizeLayout, toggleDoor as flipDoor } from "./editor"
import { fitGrid } from "./grid"
import { emptyLayout, mapLayoutSchema, parseLayout } from "./layout"
import { getActiveMap, getActiveMapVersion, listMaps, type MapSummary, type MapView } from "./queries"
import { isAllowedImageUrl, MAP_IMAGE_MAX_SIDE } from "./upload"

async function roleIn(campaignId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { role: true },
  })
  return membership?.role ?? null
}

/** La mappa, solo se chi chiede è il master della sua campagna. */
async function mapForMaster(mapId: string, userId: string) {
  return prisma.gameMap.findFirst({
    where: { id: mapId, campaign: { members: { some: { userId, role: "MASTER" } } } },
    select: { id: true, campaignId: true, imageUrl: true, imageWidth: true, imageHeight: true },
  })
}

const newMapSchema = z.object({
  name: z.string().trim().min(1, "Dai un nome alla mappa").max(80),
  imageUrl: z.string().refine(isAllowedImageUrl, "Immagine non valida"),
  imageWidth: z.number().int().min(50).max(MAP_IMAGE_MAX_SIDE),
  imageHeight: z.number().int().min(50).max(MAP_IMAGE_MAX_SIDE),
})

// Nessun refresh() della pagina: la sessione si accorge dei cambi da sola (numero di versione)
// e il pannello Mappe aggiorna il suo elenco. Un refresh completo rallentava e bloccava i pulsanti.

/** Il master crea una mappa dall'immagine appena caricata. Se non c'è una mappa attiva, diventa attiva. */
export async function createMap(
  campaignId: string,
  input: z.input<typeof newMapSchema>
): Promise<{ ok: true; mapId: string } | { ok: false; error: string }> {
  const user = await requireUser()
  if ((await roleIn(campaignId, user.id)) !== "MASTER") return { ok: false, error: "Solo il master gestisce le mappe" }

  const parsed = newMapSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" }
  const { imageWidth, imageHeight } = parsed.data

  // Griglia di partenza indicativa (circa 20 celle sul lato corto): il master la calibra subito dopo
  const grid = fitGrid(Math.round(Math.min(imageWidth, imageHeight) / 20), 0, 0, imageWidth, imageHeight)
  const hasActive = await prisma.gameMap.count({ where: { campaignId, active: true } })

  const map = await prisma.gameMap.create({
    data: { ...parsed.data, ...grid, campaignId, layout: emptyLayout(), active: hasActive === 0 },
    select: { id: true },
  })
  return { ok: true, mapId: map.id }
}

const gridSchema = z.object({
  cellSize: z.number().min(1).max(2000),
  offsetX: z.number().min(-5000).max(5000),
  offsetY: z.number().min(-5000).max(5000),
  showGrid: z.boolean(),
})

/** Calibrazione della griglia: righe e colonne si ricalcolano sul server dall'immagine. */
export async function updateMapGrid(mapId: string, input: z.input<typeof gridSchema>): Promise<FormState> {
  const user = await requireUser()
  const map = await mapForMaster(mapId, user.id)
  if (!map) return { error: "Solo il master può calibrare la griglia" }

  const parsed = gridSchema.safeParse(input)
  if (!parsed.success) return { error: "Valori della griglia non validi" }
  const grid = fitGrid(parsed.data.cellSize, parsed.data.offsetX, parsed.data.offsetY, map.imageWidth, map.imageHeight)
  // Con una griglia diversa gli ostacoli fuori dalle nuove righe e colonne si tolgono
  const { layout } = await prisma.gameMap.findUniqueOrThrow({ where: { id: mapId }, select: { layout: true } })

  await prisma.gameMap.update({
    where: { id: mapId },
    data: {
      ...grid,
      showGrid: parsed.data.showGrid,
      layout: normalizeLayout(parseLayout(layout), grid),
      version: { increment: 1 },
    },
  })
}

/**
 * Mappa attiva in sessione (null = nessuna). Una sola per campagna.
 * Restituisce subito la nuova mappa attiva: la vista del master cambia senza aspettare il polling.
 */
export async function setActiveMap(
  campaignId: string,
  mapId: string | null
): Promise<{ error?: string; map?: MapView | null }> {
  const user = await requireUser()
  if ((await roleIn(campaignId, user.id)) !== "MASTER") return { error: "Solo il master gestisce le mappe" }

  await prisma.$transaction([
    prisma.gameMap.updateMany({
      where: { campaignId, active: true },
      data: { active: false, version: { increment: 1 } },
    }),
    ...(mapId
      ? [
          prisma.gameMap.updateMany({
            where: { id: mapId, campaignId },
            data: { active: true, version: { increment: 1 } },
          }),
        ]
      : []),
  ])
  return { map: await getActiveMap(campaignId, true) }
}

/**
 * Salva gli ostacoli disegnati dal master. Il server li ripulisce contro la griglia:
 * niente celle o bordi fuori mappa, doppioni o celle sia bloccate sia difficili.
 */
export async function saveMapLayout(
  mapId: string,
  layout: unknown
): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  const user = await requireUser()
  const map = await mapForMaster(mapId, user.id)
  if (!map) return { ok: false, error: "Solo il master modifica la mappa" }

  const parsed = mapLayoutSchema.safeParse(layout)
  if (!parsed.success) return { ok: false, error: "Ostacoli non validi" }
  const grid = await prisma.gameMap.findUniqueOrThrow({ where: { id: mapId }, select: { cols: true, rows: true } })

  const saved = await prisma.gameMap.update({
    where: { id: mapId },
    data: { layout: normalizeLayout(parsed.data, grid), version: { increment: 1 } },
    select: { version: true },
  })
  return { ok: true, version: saved.version }
}

const optionsSchema = z.object({
  showObstacles: z.boolean().optional(),
  playersOpenDoors: z.boolean().optional(),
})

/** Opzioni della mappa: ostacoli visibili ai giocatori, giocatori che aprono le porte. */
export async function setMapOptions(mapId: string, options: z.input<typeof optionsSchema>): Promise<FormState> {
  const user = await requireUser()
  if (!(await mapForMaster(mapId, user.id))) return { error: "Solo il master modifica la mappa" }
  const parsed = optionsSchema.safeParse(options)
  if (!parsed.success) return { error: "Opzioni non valide" }
  await prisma.gameMap.update({ where: { id: mapId }, data: { ...parsed.data, version: { increment: 1 } } })
}

/**
 * Apre o chiude una porta. Il master sempre, i giocatori se il master lo permette (e vedono gli ostacoli).
 * Se nel frattempo qualcun altro ha cambiato la mappa, si rilegge e si riprova: nessun cambio va perso.
 */
export async function toggleMapDoor(mapId: string, edge: string): Promise<FormState> {
  const user = await requireUser()
  for (let attempt = 0; attempt < 3; attempt++) {
    const map = await prisma.gameMap.findFirst({
      where: { id: mapId, campaign: { members: { some: { userId: user.id } } } },
      select: {
        layout: true,
        version: true,
        playersOpenDoors: true,
        showObstacles: true,
        campaign: { select: { members: { where: { userId: user.id }, select: { role: true } } } },
      },
    })
    if (!map) return { error: "Mappa non trovata" }
    const isMaster = map.campaign.members[0]?.role === "MASTER"
    if (!isMaster && !(map.playersOpenDoors && map.showObstacles)) {
      return { error: "Le porte le apre il master" }
    }

    const layout = parseLayout(map.layout)
    if (!(edge in layout.doors)) return { error: "Lì non c'è una porta" }

    // Aggiorna solo se la versione è ancora quella letta: altrimenti qualcuno ha cambiato la mappa
    const { count } = await prisma.gameMap.updateMany({
      where: { id: mapId, version: map.version },
      data: { layout: flipDoor(layout, edge), version: { increment: 1 } },
    })
    if (count === 1) return
  }
  return { error: "La mappa sta cambiando, riprova" }
}

export async function renameMap(mapId: string, name: string): Promise<FormState> {
  const user = await requireUser()
  if (!(await mapForMaster(mapId, user.id))) return { error: "Solo il master gestisce le mappe" }
  const parsed = z.string().trim().min(1).max(80).safeParse(name)
  if (!parsed.success) return { error: "Nome non valido" }
  await prisma.gameMap.update({ where: { id: mapId }, data: { name: parsed.data, version: { increment: 1 } } })
}

/** Elimina la mappa con le sue pedine e prova a cancellare anche l'immagine. */
export async function deleteMap(mapId: string): Promise<FormState> {
  const user = await requireUser()
  const map = await mapForMaster(mapId, user.id)
  if (!map) return { error: "Solo il master gestisce le mappe" }

  await prisma.gameMap.delete({ where: { id: mapId } })
  // L'immagine si cancella "al meglio": se non riesce, la mappa è comunque eliminata
  try {
    if (map.imageUrl.startsWith("/uploads/maps/")) {
      await unlink(path.join(process.cwd(), "public", map.imageUrl))
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(map.imageUrl)
    }
  } catch {}
}

/** Elenco delle mappe salvate della campagna. Solo per il master. */
export async function fetchMaps(campaignId: string): Promise<MapSummary[]> {
  const user = await requireUser()
  if ((await roleIn(campaignId, user.id)) !== "MASTER") return []
  return listMaps(campaignId)
}

/** Id e versione della mappa attiva: il browser lo chiede ogni secondo. Solo per i membri. */
export async function fetchMapVersion(campaignId: string): Promise<{ id: string; version: number } | null> {
  const user = await requireUser()
  if (!(await roleIn(campaignId, user.id))) return null
  return getActiveMapVersion(campaignId)
}

/** Mappa attiva completa, quando la versione è cambiata. */
export async function fetchActiveMap(campaignId: string): Promise<MapView | null> {
  const user = await requireUser()
  const role = await roleIn(campaignId, user.id)
  if (!role) return null
  return getActiveMap(campaignId, role === "MASTER")
}
