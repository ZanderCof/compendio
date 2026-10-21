// Geometria della griglia: funzioni pure usate dalla mappa nel browser e dalle azioni sul server.
// Coordinate in pixel dell'immagine di sfondo (non dello schermo: pan e zoom sono a parte).

/** Lato di una cella in metri: lo standard 5e (5 piedi). */
export const METERS_PER_CELL = 1.5

/** Limiti di sicurezza: celle troppo piccole renderebbero la griglia illeggibile e pesante. */
export const MIN_CELL_SIZE = 8
export const MAX_GRID_CELLS = 200

export type Grid = {
  cols: number
  rows: number
  cellSize: number
  offsetX: number
  offsetY: number
}

export type Cell = { col: number; row: number }

export type Rect = { x: number; y: number; width: number; height: number }

/** Angolo in alto a sinistra di una cella. */
export function cellToPixel({ col, row }: Cell, grid: Grid) {
  return { x: grid.offsetX + col * grid.cellSize, y: grid.offsetY + row * grid.cellSize }
}

/** Centro di una cella (per una pedina di `span` celle, il centro dell'area che occupa). */
export function cellCenter(cell: Cell, grid: Grid, span = 1) {
  const { x, y } = cellToPixel(cell, grid)
  return { x: x + (grid.cellSize * span) / 2, y: y + (grid.cellSize * span) / 2 }
}

/** Cella che contiene un punto, oppure null se il punto è fuori dalla griglia. */
export function pixelToCell(x: number, y: number, grid: Grid): Cell | null {
  const col = Math.floor((x - grid.offsetX) / grid.cellSize)
  const row = Math.floor((y - grid.offsetY) / grid.cellSize)
  return isInside({ col, row }, grid) ? { col, row } : null
}

export const isInside = ({ col, row }: Cell, grid: Pick<Grid, "cols" | "rows">) =>
  col >= 0 && row >= 0 && col < grid.cols && row < grid.rows

/** Indice di una cella in un array piatto (riga per riga): così si salvano le celle nel JSON. */
export const cellIndex = ({ col, row }: Cell, cols: number) => row * cols + col

export const indexToCell = (index: number, cols: number): Cell => ({
  col: index % cols,
  row: Math.floor(index / cols),
})

/** Resto sempre positivo: l'offset della griglia sta tra 0 e una cella. */
const positiveMod = (value: number, size: number) => ((value % size) + size) % size

/**
 * Righe e colonne che entrano nell'immagine con una certa cella e un certo offset.
 * L'offset viene riportato tra 0 e una cella, così la griglia parte dal bordo dell'immagine.
 */
export function fitGrid(cellSize: number, offsetX: number, offsetY: number, imageWidth: number, imageHeight: number): Grid {
  const size = Math.max(MIN_CELL_SIZE, cellSize)
  const ox = positiveMod(offsetX, size)
  const oy = positiveMod(offsetY, size)
  return {
    cellSize: size,
    offsetX: ox,
    offsetY: oy,
    cols: Math.min(MAX_GRID_CELLS, Math.max(1, Math.floor((imageWidth - ox) / size))),
    rows: Math.min(MAX_GRID_CELLS, Math.max(1, Math.floor((imageHeight - oy) / size))),
  }
}

/**
 * Calibrazione: il master trascina un riquadro sopra una cella già disegnata sull'immagine.
 * Il lato è la media di larghezza e altezza (il riquadro a mano non è mai perfettamente quadrato),
 * l'offset è la posizione del riquadro riportata alla prima cella.
 */
export function calibrateFromRect(rect: Rect, imageWidth: number, imageHeight: number): Grid {
  // Il riquadro può essere stato trascinato verso sinistra o verso l'alto
  const x = rect.width < 0 ? rect.x + rect.width : rect.x
  const y = rect.height < 0 ? rect.y + rect.height : rect.y
  const size = (Math.abs(rect.width) + Math.abs(rect.height)) / 2
  return fitGrid(size, x, y, imageWidth, imageHeight)
}

/** Distanza in metri di un numero di celle. */
export const cellsToMeters = (cells: number) => cells * METERS_PER_CELL

// ─── Bordi (muri e porte) ────────────────────────────────────────
// Ogni bordo ha un nome unico, indipendente dalla cella da cui lo si guarda:
//   "v:c:r" = bordo verticale sul lato sinistro della cella (c, r)
//   "h:c:r" = bordo orizzontale sul lato superiore della cella (c, r)
// Il lato destro di (c, r) è il sinistro di (c+1, r), quello inferiore è il superiore di (c, r+1).

export type Side = "left" | "right" | "top" | "bottom"

export function edgeKey({ col, row }: Cell, side: Side): string {
  switch (side) {
    case "left":
      return `v:${col}:${row}`
    case "right":
      return `v:${col + 1}:${row}`
    case "top":
      return `h:${col}:${row}`
    case "bottom":
      return `h:${col}:${row + 1}`
  }
}

/** Segmento di un bordo in pixel, per disegnare muri e porte. */
export function edgeSegment(key: string, grid: Grid) {
  const [kind, c, r] = key.split(":")
  const { x, y } = cellToPixel({ col: Number(c), row: Number(r) }, grid)
  return kind === "v"
    ? { x1: x, y1: y, x2: x, y2: y + grid.cellSize }
    : { x1: x, y1: y, x2: x + grid.cellSize, y2: y }
}
