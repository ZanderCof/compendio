"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  cellsAlong,
  edgeKind,
  edgesAlong,
  erase,
  nearestEdge,
  paintCells,
  pushHistory,
  redo,
  setEdges,
  startHistory,
  undo,
  type BrushMode,
  type EditTool,
  type History,
  type Point,
} from "@/features/maps/editor"
import { cellIndex, pixelToCell } from "@/features/maps/grid"
import type { MapLayout } from "@/features/maps/layout"
import { saveMapLayout } from "@/features/maps/actions"
import type { MapView } from "@/features/maps/queries"
import type { EditHandlers } from "./mapStage"

export type SaveStatus = "saved" | "saving" | "error"

// Pausa dopo l'ultima modifica prima di salvare: un tratto lungo = un salvataggio
const SAVE_DELAY_MS = 800

type Stroke = { base: MapLayout; live: MapLayout; last: Point; mode: BrushMode }

/**
 * Editor degli ostacoli del master. Un tratto (dal tocco al rilascio) è un solo passo di annulla:
 * durante il trascinamento la mappa si aggiorna dal vivo, alla fine il tratto entra nella cronologia.
 */
export function useMapEditor(map: MapView | null) {
  const [editingMapId, setEditingMapId] = useState<string | null>(null)
  const [history, setHistory] = useState<History | null>(null)
  const [tool, setTool] = useState<EditTool>("block")
  const [strokeLayout, setStrokeLayout] = useState<MapLayout | null>(null)
  const [hoverEdge, setHoverEdge] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const stroke = useRef<Stroke | null>(null)
  // Ultimo stato salvato: serve per capire se c'è qualcosa da salvare
  const saved = useRef<MapLayout | null>(null)

  // Se il master cambia mappa mentre modifica, l'editor di quella vecchia si chiude
  const editing = editingMapId !== null && map !== null && editingMapId === map.id
  const grid = map?.grid

  const start = useCallback(() => {
    if (!map) return
    setEditingMapId(map.id)
    setHistory(startHistory(map.layout))
    saved.current = map.layout
    setSaveStatus("saved")
    setTool("block")
  }, [map])

  /** Salva subito se c'è qualcosa in sospeso. */
  const flush = useCallback(async (layout: MapLayout, mapId: string) => {
    if (layout === saved.current) return true
    setSaveStatus("saving")
    const result = await saveMapLayout(mapId, layout)
    if (!result.ok) {
      setSaveStatus("error")
      toast.error(result.error)
      return false
    }
    saved.current = layout
    setSaveStatus("saved")
    return true
  }, [])

  // Salvataggio automatico dopo una breve pausa
  const present = history?.present
  useEffect(() => {
    if (!editing || !present || !editingMapId || present === saved.current) return
    setSaveStatus("saving")
    const timer = setTimeout(() => flush(present, editingMapId), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [editing, present, editingMapId, flush])

  const stop = useCallback(async () => {
    if (present && editingMapId) await flush(present, editingMapId)
    setEditingMapId(null)
    setHistory(null)
    setStrokeLayout(null)
    setHoverEdge(null)
  }, [present, editingMapId, flush])

  /** Applica lo strumento lungo un tratto, partendo dallo stato prima del tratto. */
  const apply = useCallback(
    (layout: MapLayout, from: Point, to: Point, mode: BrushMode): MapLayout => {
      if (!grid) return layout
      switch (tool) {
        case "block":
          return paintCells(layout, "blocked", cellsAlong(from, to, grid), mode)
        case "difficult":
          return paintCells(layout, "difficult", cellsAlong(from, to, grid), mode)
        case "wall":
          return setEdges(layout, edgesAlong(from, to, grid), mode === "add" ? "wall" : "none")
        case "erase":
          return erase(layout, cellsAlong(from, to, grid), edgesAlong(from, to, grid))
        default:
          return layout
      }
    },
    [tool, grid]
  )

  const handlers: EditHandlers | undefined =
    editing && history && grid && tool !== "pan"
      ? {
          onStart: (p) => {
            const base = history.present
            // Porta: un tocco trasforma il bordo (muro o niente → porta, porta → muro)
            if (tool === "door") {
              const edge = nearestEdge(p, grid)
              if (!edge) return
              const next = setEdges(base, [edge], edgeKind(base, edge) === "door" ? "wall" : "door")
              setHistory((h) => (h ? pushHistory(h, next) : h))
              return
            }
            // Il pennello capisce da dove parti: da una cella già dipinta cancella, altrimenti dipinge
            let mode: BrushMode = "add"
            if (tool === "block" || tool === "difficult") {
              const cell = pixelToCell(p.x, p.y, grid)
              const field = tool === "block" ? "blocked" : "difficult"
              if (cell && base[field].includes(cellIndex(cell, grid.cols))) mode = "remove"
            } else if (tool === "wall") {
              const edge = nearestEdge(p, grid)
              if (edge && edgeKind(base, edge) === "wall") mode = "remove"
            }
            const live = apply(base, p, p, mode)
            stroke.current = { base, live, last: p, mode }
            setStrokeLayout(live)
          },
          onMove: (p) => {
            const s = stroke.current
            if (!s) return
            s.live = apply(s.live, s.last, p, s.mode)
            s.last = p
            setStrokeLayout(s.live)
            if (tool === "wall") setHoverEdge(nearestEdge(p, grid))
          },
          onEnd: () => {
            const s = stroke.current
            stroke.current = null
            setStrokeLayout(null)
            if (s && s.live !== s.base) setHistory((h) => (h ? pushHistory(h, s.live) : h))
          },
          onCancel: () => {
            stroke.current = null
            setStrokeLayout(null)
          },
          onHover: (p) => setHoverEdge(p && (tool === "wall" || tool === "door") ? nearestEdge(p, grid) : null),
        }
      : undefined

  const canUndo = !!history && history.past.length > 0
  const canRedo = !!history && history.future.length > 0

  // Ctrl+Z / Ctrl+Y (o Ctrl+Maiusc+Z) sul PC
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.closest("input, textarea")) return
      const key = e.key.toLowerCase()
      if (key === "z" && !e.shiftKey) {
        e.preventDefault()
        setHistory((h) => (h ? undo(h) : h))
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault()
        setHistory((h) => (h ? redo(h) : h))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [editing])

  return {
    editing,
    start,
    stop,
    tool,
    setTool: (next: EditTool) => {
      setTool(next)
      setHoverEdge(null)
    },
    /** Ostacoli da mostrare: il tratto in corso, altrimenti lo stato attuale dell'editor */
    layout: strokeLayout ?? history?.present ?? null,
    handlers,
    hoverEdge: editing && (tool === "wall" || tool === "door") ? hoverEdge : null,
    undo: () => setHistory((h) => (h ? undo(h) : h)),
    redo: () => setHistory((h) => (h ? redo(h) : h)),
    canUndo,
    canRedo,
    saveStatus,
  }
}
