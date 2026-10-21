import { describe, expect, it } from "vitest"

import {
  cellsAlong,
  edgeKind,
  edgesAlong,
  erase,
  HISTORY_LIMIT,
  nearestEdge,
  normalizeLayout,
  paintCells,
  pushHistory,
  redo,
  setEdges,
  startHistory,
  toggleDoor,
  undo,
} from "./editor"
import type { Grid } from "./grid"
import { emptyLayout } from "./layout"

const grid: Grid = { cols: 10, rows: 10, cellSize: 50, offsetX: 0, offsetY: 0 }

describe("celle", () => {
  it("bloccare una cella difficile la toglie dal terreno difficile", () => {
    let layout = paintCells(emptyLayout(), "difficult", [1, 2], "add")
    layout = paintCells(layout, "blocked", [2, 3], "add")
    expect(layout.blocked).toEqual([2, 3])
    expect(layout.difficult).toEqual([1])
  })

  it("dipingere due volte la stessa cella non crea doppioni", () => {
    const layout = paintCells(paintCells(emptyLayout(), "blocked", [5], "add"), "blocked", [5, 4], "add")
    expect(layout.blocked).toEqual([4, 5])
  })

  it("si cancella con la modalità rimuovi", () => {
    const layout = paintCells(paintCells(emptyLayout(), "blocked", [1, 2, 3], "add"), "blocked", [2], "remove")
    expect(layout.blocked).toEqual([1, 3])
  })
})

describe("bordi", () => {
  it("un muro diventato porta non è più un muro, e la porta nasce chiusa", () => {
    let layout = setEdges(emptyLayout(), ["v:2:3"], "wall")
    layout = setEdges(layout, ["v:2:3"], "door")
    expect(layout.walls).toEqual([])
    expect(layout.doors).toEqual({ "v:2:3": false })
    expect(edgeKind(layout, "v:2:3")).toBe("door")
  })

  it("una porta aperta resta aperta se la si ridisegna come porta", () => {
    const layout = setEdges(toggleDoor(setEdges(emptyLayout(), ["h:1:1"], "door"), "h:1:1"), ["h:1:1"], "door")
    expect(layout.doors["h:1:1"]).toBe(true)
  })

  it("aprire una porta che non esiste non cambia nulla", () => {
    const layout = emptyLayout()
    expect(toggleDoor(layout, "v:1:1")).toBe(layout)
  })

  it("la gomma toglie celle, muri e porte", () => {
    let layout = paintCells(emptyLayout(), "blocked", [7], "add")
    layout = setEdges(setEdges(layout, ["v:1:0"], "wall"), ["h:0:1"], "door")
    layout = erase(layout, [7], ["v:1:0", "h:0:1"])
    expect(layout).toEqual(emptyLayout())
  })
})

describe("nearestEdge", () => {
  it("vicino alla linea verticale prende il bordo verticale", () => {
    expect(nearestEdge({ x: 102, y: 75 }, grid)).toBe("v:2:1")
  })

  it("vicino alla linea orizzontale prende il bordo orizzontale", () => {
    expect(nearestEdge({ x: 75, y: 148 }, grid)).toBe("h:1:3")
  })

  it("al centro della cella non prende nessun bordo", () => {
    expect(nearestEdge({ x: 75, y: 75 }, grid)).toBeNull()
  })

  it("i bordi esterni della griglia sono validi, fuori no", () => {
    expect(nearestEdge({ x: 1, y: 25 }, grid)).toBe("v:0:0")
    expect(nearestEdge({ x: -60, y: 25 }, grid)).toBeNull()
  })
})

describe("trascinamento", () => {
  it("un trascinamento veloce su una riga prende tutte le celle in mezzo", () => {
    expect(cellsAlong({ x: 25, y: 25 }, { x: 225, y: 25 }, grid)).toEqual([0, 1, 2, 3, 4])
  })

  it("trascinando lungo una linea si ottiene un muro continuo", () => {
    expect(edgesAlong({ x: 100, y: 10 }, { x: 100, y: 140 }, grid)).toEqual(["v:2:0", "v:2:1", "v:2:2"])
  })
})

describe("normalizeLayout", () => {
  it("toglie quello che esce dalla griglia dopo una ricalibrazione", () => {
    const layout = {
      blocked: [3, 99, 150, -1],
      difficult: [3, 4],
      walls: ["v:10:9", "v:11:0", "h:0:10", "h:0:11"],
      doors: { "v:1:20": false, "h:2:2": true },
    }
    expect(normalizeLayout(layout, { cols: 10, rows: 10 })).toEqual({
      blocked: [3, 99],
      difficult: [4], // la 3 è già bloccata
      walls: ["h:0:10", "v:10:9"],
      doors: { "h:2:2": true },
    })
  })
})

describe("annulla e ripeti", () => {
  it("annulla torna indietro, ripeti torna avanti, un nuovo cambio cancella il ripeti", () => {
    const a = emptyLayout()
    const b = paintCells(a, "blocked", [1], "add")
    const c = paintCells(b, "blocked", [2], "add")
    let h = pushHistory(pushHistory(startHistory(a), b), c)
    h = undo(h)
    expect(h.present).toBe(b)
    h = redo(h)
    expect(h.present).toBe(c)
    h = pushHistory(undo(h), paintCells(b, "blocked", [9], "add"))
    expect(h.future).toEqual([])
  })

  it(`tiene al massimo ${HISTORY_LIMIT} passi`, () => {
    let h = startHistory(emptyLayout())
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) h = pushHistory(h, paintCells(h.present, "blocked", [i], "add"))
    expect(h.past).toHaveLength(HISTORY_LIMIT)
  })
})
