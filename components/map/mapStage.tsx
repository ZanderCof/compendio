"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type Konva from "konva"
import { Image as KonvaImage, Layer, Line, Rect, Shape, Stage } from "react-konva"
import { Maximize, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cellToPixel, edgeSegment, indexToCell, type Grid, type Rect as GridRect } from "@/features/maps/grid"
import type { MapLayout } from "@/features/maps/layout"

const MIN_SCALE = 0.05
const MAX_SCALE = 6
const WHEEL_FACTOR = 1.1

// Colori degli ostacoli (palette del sito)
const BLOCKED_FILL = "rgba(170, 62, 152, 0.45)" // plum
const DIFFICULT_FILL = "rgba(132, 199, 208, 0.45)" // sky
const WALL_COLOR = "#2a1f3d"
const DOOR_COLOR = "#75DDDD" // aqua

export type Point = { x: number; y: number }

/** Gesti dell'editor: con un dito si disegna, con due dita si sposta e si zooma. */
export type EditHandlers = {
  onStart: (point: Point) => void
  onMove: (point: Point) => void
  onEnd: () => void
  /** Il tratto si interrompe (es. arriva un secondo dito per lo zoom) */
  onCancel: () => void
  /** Movimento del cursore senza premere: serve per evidenziare il bordo sotto il mouse */
  onHover?: (point: Point | null) => void
}

/** Carica un'immagine per Konva. Restituisce null finché non è pronta. */
function useImage(url: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    const img = new window.Image()
    // Le immagini su Vercel Blob stanno su un altro dominio
    img.crossOrigin = "anonymous"
    img.onload = () => setImage(img)
    img.src = url
    return () => {
      img.onload = null
    }
  }, [url])
  return image
}

/** Dimensioni del contenitore: lo stage di Konva ha bisogno di numeri in pixel. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

type View = { scale: number; x: number; y: number }

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))

export type MapStageProps = {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  grid: Grid
  showGrid: boolean
  /** Ostacoli da disegnare (vuoti = nessun livello) */
  layout?: MapLayout
  /** Calibrazione: trascinando si disegna un riquadro invece di spostare la mappa */
  calibrating?: boolean
  onCalibrateRect?: (rect: GridRect) => void
  /** Editor degli ostacoli attivo con uno strumento di disegno */
  edit?: EditHandlers
  /** Bordo evidenziato (strumenti muro e porta) */
  highlightEdge?: string | null
  /** Tocco/clic senza trascinare (es. per aprire una porta) */
  onTap?: (point: Point) => void
}

export function MapStage({
  imageUrl,
  imageWidth,
  imageHeight,
  grid,
  showGrid,
  layout,
  calibrating = false,
  onCalibrateRect,
  edit,
  highlightEdge,
  onTap,
}: MapStageProps) {
  const [containerRef, size] = useSize<HTMLDivElement>()
  const stageRef = useRef<Konva.Stage>(null)
  const image = useImage(imageUrl)
  // null = inquadratura "mappa intera"; diventa un valore appena si sposta o si zooma
  const [manualView, setManualView] = useState<View | null>(null)
  const [draftRect, setDraftRect] = useState<GridRect | null>(null)
  const pinch = useRef<{ distance: number; center: Point } | null>(null)
  // Un dito sta disegnando con l'editor
  const stroking = useRef(false)

  /** Mappa intera nel riquadro, centrata. */
  const fitted = useMemo<View | null>(() => {
    if (!size.width || !size.height) return null
    const scale = clampScale(Math.min(size.width / imageWidth, size.height / imageHeight) * 0.95)
    return { scale, x: (size.width - imageWidth * scale) / 2, y: (size.height - imageHeight * scale) / 2 }
  }, [size.width, size.height, imageWidth, imageHeight])

  const view = manualView ?? fitted
  const fit = () => setManualView(null)

  /** Aggiorna la vista partendo da quella attuale (anche se è ancora quella automatica). */
  const setView = useCallback(
    (update: (current: View) => View) =>
      setManualView((current) => {
        const base = current ?? fitted
        return base ? update(base) : current
      }),
    [fitted]
  )

  /** Zoom tenendo fermo un punto dello schermo (il cursore o il centro delle dita). */
  const zoomAt = useCallback(
    (point: Point, nextScale: number) => {
      setView((current) => {
        const scale = clampScale(nextScale)
        const imagePoint = { x: (point.x - current.x) / current.scale, y: (point.y - current.y) / current.scale }
        return { scale, x: point.x - imagePoint.x * scale, y: point.y - imagePoint.y * scale }
      })
    },
    [setView]
  )

  const zoomButton = (factor: number) => {
    if (view) zoomAt({ x: size.width / 2, y: size.height / 2 }, view.scale * factor)
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer || !view) return
    zoomAt(pointer, e.evt.deltaY < 0 ? view.scale * WHEEL_FACTOR : view.scale / WHEEL_FACTOR)
  }

  // Pinch a due dita: distanza tra le dita = zoom, spostamento del centro = pan
  function handleTouchMove(e: Konva.KonvaEventObject<TouchEvent>) {
    const [a, b] = Array.from(e.evt.touches)
    if (!a || !b) return
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    if (stage.isDragging()) stage.stopDrag()
    // Il secondo dito interrompe il disegno: si sta zoomando
    if (stroking.current) {
      stroking.current = false
      edit?.onCancel()
    }

    const rect = stage.container().getBoundingClientRect()
    const center = { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top }
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const last = pinch.current
    pinch.current = { distance, center }
    if (!last) return

    setView((current) => {
      const scale = clampScale(current.scale * (distance / last.distance))
      const imagePoint = { x: (last.center.x - current.x) / current.scale, y: (last.center.y - current.y) / current.scale }
      return { scale, x: center.x - imagePoint.x * scale, y: center.y - imagePoint.y * scale }
    })
  }

  /** Punto dell'immagine sotto il dito/cursore. */
  const imagePointer = (): Point | null => stageRef.current?.getRelativePointerPosition() ?? null

  const multiTouch = (e: Konva.KonvaEventObject<PointerEvent>) =>
    e.evt.pointerType === "touch" && (pinch.current !== null || !e.evt.isPrimary)

  function handlePointerDown(e: Konva.KonvaEventObject<PointerEvent>) {
    const p = imagePointer()
    if (!p || multiTouch(e)) return
    if (calibrating) {
      setDraftRect({ x: p.x, y: p.y, width: 0, height: 0 })
    } else if (edit) {
      stroking.current = true
      edit.onStart(p)
    }
  }

  function handlePointerMove(e: Konva.KonvaEventObject<PointerEvent>) {
    const p = imagePointer()
    if (!p) return
    if (calibrating && draftRect) {
      setDraftRect({ ...draftRect, width: p.x - draftRect.x, height: p.y - draftRect.y })
    } else if (edit) {
      if (stroking.current && !multiTouch(e)) edit.onMove(p)
      else if (e.evt.pointerType === "mouse") edit.onHover?.(p)
    }
  }

  function handlePointerUp() {
    if (calibrating && draftRect) {
      // Un tocco senza trascinare non conta
      if (Math.abs(draftRect.width) > 4 && Math.abs(draftRect.height) > 4) onCalibrateRect?.(draftRect)
      setDraftRect(null)
    } else if (edit && stroking.current) {
      stroking.current = false
      edit.onEnd()
    }
  }

  // Durante il disegno (calibrazione o editor) un dito non sposta la mappa: si sposta con due dita
  const panning = !calibrating && !edit

  // Ostacoli: celle in un'unica figura per colore, muri in un'unica figura
  const hasObstacles =
    !!layout &&
    (layout.blocked.length > 0 || layout.difficult.length > 0 || layout.walls.length > 0 || Object.keys(layout.doors).length > 0)
  const wallWidth = Math.max(3, grid.cellSize * 0.12)

  return (
    <div ref={containerRef} className="relative h-full w-full touch-none overflow-hidden bg-muted/40">
      {size.width > 0 && view && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          scaleX={view.scale}
          scaleY={view.scale}
          x={view.x}
          y={view.y}
          draggable={panning}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) setView((current) => ({ ...current, x: e.target.x(), y: e.target.y() }))
          }}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => {
            if (e.evt.touches.length < 2) pinch.current = null
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            edit?.onHover?.(null)
            if (stroking.current) handlePointerUp()
          }}
          onClick={() => {
            if (!panning || !onTap) return
            const p = imagePointer()
            if (p) onTap(p)
          }}
          onTap={() => {
            if (!panning || !onTap) return
            const p = imagePointer()
            if (p) onTap(p)
          }}
          style={{ cursor: calibrating || edit ? "crosshair" : "grab" }}
        >
          {/* Sfondo: non cambia mai durante il gioco */}
          <Layer listening={false}>
            {image && <KonvaImage image={image} width={imageWidth} height={imageHeight} />}
          </Layer>

          {/* Griglia: un'unica figura invece di centinaia di linee separate */}
          {showGrid && (
            <Layer listening={false}>
              <Shape
                sceneFunc={(ctx, shape) => {
                  const { cols, rows, cellSize, offsetX, offsetY } = grid
                  ctx.beginPath()
                  for (let c = 0; c <= cols; c++) {
                    ctx.moveTo(offsetX + c * cellSize, offsetY)
                    ctx.lineTo(offsetX + c * cellSize, offsetY + rows * cellSize)
                  }
                  for (let r = 0; r <= rows; r++) {
                    ctx.moveTo(offsetX, offsetY + r * cellSize)
                    ctx.lineTo(offsetX + cols * cellSize, offsetY + r * cellSize)
                  }
                  ctx.strokeShape(shape)
                }}
                stroke="rgba(20, 16, 30, 0.55)"
                strokeWidth={1}
                // Linee sottili a qualsiasi zoom
                strokeScaleEnabled={false}
              />
            </Layer>
          )}

          {/* Ostacoli: cambiano solo quando il master modifica la mappa */}
          {hasObstacles && layout && (
            <Layer listening={false}>
              {(["blocked", "difficult"] as const).map((field) => (
                <Shape
                  key={field}
                  sceneFunc={(ctx, shape) => {
                    ctx.beginPath()
                    for (const index of layout[field]) {
                      const { x, y } = cellToPixel(indexToCell(index, grid.cols), grid)
                      ctx.rect(x, y, grid.cellSize, grid.cellSize)
                    }
                    ctx.fillShape(shape)
                  }}
                  fill={field === "blocked" ? BLOCKED_FILL : DIFFICULT_FILL}
                />
              ))}
              <Shape
                sceneFunc={(ctx, shape) => {
                  ctx.beginPath()
                  for (const key of layout.walls) {
                    const s = edgeSegment(key, grid)
                    ctx.moveTo(s.x1, s.y1)
                    ctx.lineTo(s.x2, s.y2)
                  }
                  ctx.strokeShape(shape)
                }}
                stroke={WALL_COLOR}
                strokeWidth={wallWidth}
                lineCap="round"
              />
              {Object.entries(layout.doors).map(([key, open]) => {
                const s = edgeSegment(key, grid)
                return (
                  <Line
                    key={key}
                    points={[s.x1, s.y1, s.x2, s.y2]}
                    stroke={DOOR_COLOR}
                    strokeWidth={wallWidth}
                    // Porta aperta: tratteggiata e più sottile
                    dash={open ? [wallWidth, wallWidth] : undefined}
                    opacity={open ? 0.7 : 1}
                    shadowColor={WALL_COLOR}
                    shadowBlur={open ? 0 : 2}
                    lineCap="butt"
                  />
                )
              })}
            </Layer>
          )}

          {/* Livello in primo piano: cambia spesso (evidenziazioni, riquadro di calibrazione) */}
          {(highlightEdge || (calibrating && draftRect)) && (
            <Layer listening={false}>
              {highlightEdge &&
                (() => {
                  const s = edgeSegment(highlightEdge, grid)
                  return (
                    <Line
                      points={[s.x1, s.y1, s.x2, s.y2]}
                      stroke="#AA3E98"
                      strokeWidth={wallWidth * 1.4}
                      opacity={0.75}
                      lineCap="round"
                    />
                  )
                })()}
              {calibrating && draftRect && (
                <Rect
                  {...draftRect}
                  stroke="#AA3E98"
                  strokeWidth={2}
                  strokeScaleEnabled={false}
                  dash={[6, 4]}
                  fill="rgba(170, 62, 152, 0.15)"
                />
              )}
            </Layer>
          )}
        </Stage>
      )}

      {!image && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Carico la mappa…
        </div>
      )}

      {/* Comandi di zoom: grandi per il telefono. Salgono sopra i pannelli in basso (--controls-bottom) */}
      <div className="absolute right-3 bottom-[calc(0.75rem+var(--controls-bottom,0px))] flex flex-col gap-2 transition-[bottom] lg:bottom-3">
        <Button size="icon-lg" variant="secondary" className="shadow" aria-label="Avvicina" onClick={() => zoomButton(1.3)}>
          <Plus />
        </Button>
        <Button size="icon-lg" variant="secondary" className="shadow" aria-label="Allontana" onClick={() => zoomButton(1 / 1.3)}>
          <Minus />
        </Button>
        <Button size="icon-lg" variant="secondary" className="shadow" aria-label="Mostra tutta la mappa" onClick={fit}>
          <Maximize />
        </Button>
      </div>
    </div>
  )
}
