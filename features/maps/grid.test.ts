import { describe, expect, it } from "vitest"

import {
  calibrateFromRect,
  cellCenter,
  cellIndex,
  cellToPixel,
  edgeKey,
  edgeSegment,
  fitGrid,
  indexToCell,
  MAX_GRID_CELLS,
  pixelToCell,
  type Grid,
} from "./grid"
import { parseLayout } from "./layout"

const grid: Grid = { cols: 10, rows: 8, cellSize: 50, offsetX: 10, offsetY: 20 }

describe("coordinate", () => {
  it("cella → pixel e ritorno", () => {
    expect(cellToPixel({ col: 2, row: 3 }, grid)).toEqual({ x: 110, y: 170 })
    expect(pixelToCell(135, 195, grid)).toEqual({ col: 2, row: 3 })
  })

  it("il centro di una pedina grande sta al centro delle sue 2×2 celle", () => {
    expect(cellCenter({ col: 0, row: 0 }, grid, 2)).toEqual({ x: 60, y: 70 })
  })

  it("fuori dalla griglia non c'è cella", () => {
    expect(pixelToCell(5, 25, grid)).toBeNull() // prima dell'offset
    expect(pixelToCell(10 + 50 * 10 + 1, 30, grid)).toBeNull() // oltre l'ultima colonna
  })

  it("indice piatto e ritorno", () => {
    expect(cellIndex({ col: 3, row: 2 }, 10)).toBe(23)
    expect(indexToCell(23, 10)).toEqual({ col: 3, row: 2 })
  })
})

describe("calibrazione", () => {
  it("un riquadro sopra la terza cella dà lato, offset e dimensioni della griglia", () => {
    // Immagine 1000×800, celle da 70 px che iniziano a x=15, y=5: riquadro sopra la cella (2, 1)
    const g = calibrateFromRect({ x: 155, y: 75, width: 71, height: 69 }, 1000, 800)
    expect(g.cellSize).toBe(70)
    expect(g.offsetX).toBe(15)
    expect(g.offsetY).toBe(5)
    expect(g.cols).toBe(14) // (1000 - 15) / 70 = 14,07
    expect(g.rows).toBe(11) // (800 - 5) / 70 = 11,36
  })

  it("funziona anche trascinando verso sinistra e verso l'alto", () => {
    const g = calibrateFromRect({ x: 225, y: 145, width: -70, height: -70 }, 1000, 800)
    expect(g).toMatchObject({ cellSize: 70, offsetX: 15, offsetY: 5 })
  })

  it("l'offset negativo delle regolazioni fini torna tra 0 e una cella", () => {
    expect(fitGrid(50, -10, 120, 500, 500)).toMatchObject({ offsetX: 40, offsetY: 20 })
  })

  it("celle minuscole o immagini enormi non producono griglie infinite", () => {
    const g = fitGrid(1, 0, 0, 10_000, 10_000)
    expect(g.cellSize).toBeGreaterThanOrEqual(8)
    expect(g.cols).toBeLessThanOrEqual(MAX_GRID_CELLS)
  })
})

describe("bordi", () => {
  it("lo stesso bordo ha lo stesso nome visto dalle due celle", () => {
    expect(edgeKey({ col: 2, row: 3 }, "right")).toBe(edgeKey({ col: 3, row: 3 }, "left"))
    expect(edgeKey({ col: 2, row: 3 }, "bottom")).toBe(edgeKey({ col: 2, row: 4 }, "top"))
  })

  it("segmento in pixel di un bordo verticale e di uno orizzontale", () => {
    expect(edgeSegment("v:1:0", grid)).toEqual({ x1: 60, y1: 20, x2: 60, y2: 70 })
    expect(edgeSegment("h:0:1", grid)).toEqual({ x1: 10, y1: 70, x2: 60, y2: 70 })
  })
})

describe("layout", () => {
  it("un JSON rovinato diventa una mappa senza ostacoli", () => {
    expect(parseLayout({ blocked: "tutto" })).toEqual({ blocked: [], difficult: [], walls: [], doors: {} })
  })

  it("campi mancanti partono vuoti", () => {
    expect(parseLayout({ blocked: [3] })).toEqual({ blocked: [3], difficult: [], walls: [], doors: {} })
  })
})
