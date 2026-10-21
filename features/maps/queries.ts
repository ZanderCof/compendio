import "server-only"

import { prisma } from "@/lib/prisma"
import type { Grid } from "./grid"
import { emptyLayout, parseLayout, type MapLayout } from "./layout"

export type MapView = {
  id: string
  name: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  grid: Grid
  showGrid: boolean
  showObstacles: boolean
  /** Ostacoli: il master li vede sempre, i giocatori solo se il master li mostra */
  layout: MapLayout
  version: number
}

export type MapSummary = { id: string; name: string; imageUrl: string; active: boolean; cols: number; rows: number }

const mapSelect = {
  id: true,
  name: true,
  imageUrl: true,
  imageWidth: true,
  imageHeight: true,
  cols: true,
  rows: true,
  cellSize: true,
  offsetX: true,
  offsetY: true,
  showGrid: true,
  showObstacles: true,
  layout: true,
  version: true,
} as const

/** Mappa attiva della campagna, preparata per chi guarda. */
export async function getActiveMap(campaignId: string, viewerIsMaster: boolean): Promise<MapView | null> {
  const map = await prisma.gameMap.findFirst({ where: { campaignId, active: true }, select: mapSelect })
  if (!map) return null
  return {
    id: map.id,
    name: map.name,
    imageUrl: map.imageUrl,
    imageWidth: map.imageWidth,
    imageHeight: map.imageHeight,
    grid: { cols: map.cols, rows: map.rows, cellSize: map.cellSize, offsetX: map.offsetX, offsetY: map.offsetY },
    showGrid: map.showGrid,
    showObstacles: map.showObstacles,
    layout: viewerIsMaster || map.showObstacles ? parseLayout(map.layout) : emptyLayout(),
    version: map.version,
  }
}

/** Solo id e versione della mappa attiva: è quello che i browser chiedono ogni secondo. */
export async function getActiveMapVersion(campaignId: string) {
  return prisma.gameMap.findFirst({
    where: { campaignId, active: true },
    select: { id: true, version: true },
  })
}

export async function listMaps(campaignId: string): Promise<MapSummary[]> {
  return prisma.gameMap.findMany({
    where: { campaignId },
    select: { id: true, name: true, imageUrl: true, active: true, cols: true, rows: true },
    orderBy: { createdAt: "desc" },
  })
}
