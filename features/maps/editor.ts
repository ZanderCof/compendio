import { cellIndex, pixelToCell, type Grid } from "./grid"
import type { MapLayout } from "./layout"

// Regole dell'editor degli ostacoli: funzioni pure, usate dall'editor nel browser e dal server per validare.

export type EditTool = "pan" | "block" | "difficult" | "wall" | "door" | "erase"
export type BrushMode = "add" | "remove"
export type Point = { x: number; y: number }

/** Quanto vicino a un bordo (in frazione di cella) bisogna toccare perché lo si prenda. */
const EDGE_SNAP = 0.3

const uniqueSorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b)

/**
 * Blocca o rende difficili delle celle (o le libera). Una cella non è mai sia bloccata sia difficile:
 * metterla in una lista la toglie dall'altra.
 */
export function paintCells(
  layout: MapLayout,
  field: "blocked" | "difficult",
  cells: number[],
  mode: BrushMode
): MapLayout {
  const other = field === "blocked" ? "difficult" : "blocked"
  const set = new Set(cells)
  if (mode === "remove") {
    return { ...layout, [field]: layout[field].filter((i) => !set.has(i)) }
  }
  return {
    ...layout,
    [field]: uniqueSorted([...layout[field], ...cells]),
    [other]: layout[other].filter((i) => !set.has(i)),
  }
}

/** Imposta dei bordi come muro, porta (chiusa) o niente. Un bordo è sempre una cosa sola. */
export function setEdges(layout: MapLayout, edges: string[], kind: "wall" | "door" | "none"): MapLayout {
  const set = new Set(edges)
  const walls = layout.walls.filter((e) => !set.has(e))
  const doors = Object.fromEntries(Object.entries(layout.doors).filter(([e]) => !set.has(e)))
  if (kind === "wall") walls.push(...edges)
  // Una porta che c'era già mantiene il suo stato (aperta/chiusa); quelle nuove nascono chiuse
  if (kind === "door") for (const e of edges) doors[e] = layout.doors[e] ?? false
  return { ...layout, walls: [...new Set(walls)].sort(), doors }
}

/** Gomma: libera le celle e toglie muri e porte dai bordi indicati. */
export function erase(layout: MapLayout, cells: number[], edges: string[]): MapLayout {
  const cleared = paintCells(paintCells(layout, "blocked", cells, "remove"), "difficult", cells, "remove")
  return setEdges(cleared, edges, "none")
}

/** Apre o chiude una porta esistente. Se il bordo non è una porta, non cambia nulla. */
export function toggleDoor(layout: MapLayout, edge: string): MapLayout {
  if (!(edge in layout.doors)) return layout
  return { ...layout, doors: { ...layout.doors, [edge]: !layout.doors[edge] } }
}

/** Che cosa c'è su un bordo. */
export function edgeKind(layout: MapLayout, edge: string): "wall" | "door" | "none" {
  if (edge in layout.doors) return "door"
  return layout.walls.includes(edge) ? "wall" : "none"
}

/** Il bordo più vicino a un punto, se è abbastanza vicino da sembrare voluto. */
export function nearestEdge(point: Point, grid: Grid): string | null {
  const fx = (point.x - grid.offsetX) / grid.cellSize
  const fy = (point.y - grid.offsetY) / grid.cellSize
  const col = Math.floor(fx)
  const row = Math.floor(fy)

  // Linea verticale più vicina (bordo sinistro della colonna vc) nella riga sotto il punto
  const vc = Math.round(fx)
  const vDistance = Math.abs(fx - vc)
  const vValid = vc >= 0 && vc <= grid.cols && row >= 0 && row < grid.rows
  // Linea orizzontale più vicina (bordo superiore della riga hr) nella colonna sotto il punto
  const hr = Math.round(fy)
  const hDistance = Math.abs(fy - hr)
  const hValid = hr >= 0 && hr <= grid.rows && col >= 0 && col < grid.cols

  const candidates = [
    ...(vValid && vDistance <= EDGE_SNAP ? [{ key: `v:${vc}:${row}`, d: vDistance }] : []),
    ...(hValid && hDistance <= EDGE_SNAP ? [{ key: `h:${col}:${hr}`, d: hDistance }] : []),
  ]
  candidates.sort((a, b) => a.d - b.d)
  return candidates[0]?.key ?? null
}

/** Punti lungo un segmento, abbastanza fitti da non saltare celle o bordi durante un trascinamento veloce. */
function samples(from: Point, to: Point, grid: Grid): Point[] {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.ceil(length / (grid.cellSize / 4)))
  return Array.from({ length: steps + 1 }, (_, i) => ({
    x: from.x + ((to.x - from.x) * i) / steps,
    y: from.y + ((to.y - from.y) * i) / steps,
  }))
}

/** Celle toccate trascinando da un punto all'altro (indici, senza doppioni). */
export function cellsAlong(from: Point, to: Point, grid: Grid): number[] {
  const cells = samples(from, to, grid)
    .map((p) => pixelToCell(p.x, p.y, grid))
    .filter((c) => c !== null)
    .map((c) => cellIndex(c, grid.cols))
  return [...new Set(cells)]
}

/** Bordi toccati trascinando lungo una linea: così si disegna un muro continuo. */
export function edgesAlong(from: Point, to: Point, grid: Grid): string[] {
  const edges = samples(from, to, grid)
    .map((p) => nearestEdge(p, grid))
    .filter((e) => e !== null)
  return [...new Set(edges)]
}

// ─── Validazione ─────────────────────────────────────────────────

function edgeInGrid(key: string, grid: Pick<Grid, "cols" | "rows">) {
  const [kind, c, r] = key.split(":")
  const col = Number(c)
  const row = Number(r)
  return kind === "v"
    ? col >= 0 && col <= grid.cols && row >= 0 && row < grid.rows
    : col >= 0 && col < grid.cols && row >= 0 && row <= grid.rows
}

/**
 * Toglie quello che è fuori dalla griglia (es. dopo una ricalibrazione con meno celle),
 * i doppioni e le sovrapposizioni. Il server lo applica a ogni salvataggio.
 */
export function normalizeLayout(layout: MapLayout, grid: Pick<Grid, "cols" | "rows">): MapLayout {
  const cellCount = grid.cols * grid.rows
  const inGrid = (i: number) => Number.isInteger(i) && i >= 0 && i < cellCount
  const blocked = uniqueSorted(layout.blocked.filter(inGrid))
  const blockedSet = new Set(blocked)
  const doors = Object.fromEntries(Object.entries(layout.doors).filter(([e]) => edgeInGrid(e, grid)))
  return {
    blocked,
    difficult: uniqueSorted(layout.difficult.filter((i) => inGrid(i) && !blockedSet.has(i))),
    walls: [...new Set(layout.walls.filter((e) => edgeInGrid(e, grid) && !(e in doors)))].sort(),
    doors,
  }
}

// ─── Annulla / ripeti ────────────────────────────────────────────

export const HISTORY_LIMIT = 50

export type History = { past: MapLayout[]; present: MapLayout; future: MapLayout[] }

export const startHistory = (present: MapLayout): History => ({ past: [], present, future: [] })

/** Nuovo stato: il precedente va in "annulla" (al massimo 50 passi), "ripeti" si svuota. */
export function pushHistory(history: History, next: MapLayout): History {
  if (next === history.present) return history
  return { past: [...history.past, history.present].slice(-HISTORY_LIMIT), present: next, future: [] }
}

export function undo(history: History): History {
  const previous = history.past.at(-1)
  if (!previous) return history
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] }
}

export function redo(history: History): History {
  const [next, ...rest] = history.future
  if (!next) return history
  return { past: [...history.past, history.present], present: next, future: rest }
}
