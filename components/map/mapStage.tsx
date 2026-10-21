"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type Konva from "konva"
import { Image as KonvaImage, Layer, Rect, Shape, Stage } from "react-konva"
import { Maximize, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Grid, Rect as GridRect } from "@/features/maps/grid"

const MIN_SCALE = 0.05
const MAX_SCALE = 6
const WHEEL_FACTOR = 1.1

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
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      })
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
  /** Calibrazione: trascinando si disegna un riquadro invece di spostare la mappa */
  calibrating?: boolean
  onCalibrateRect?: (rect: GridRect) => void
}

export function MapStage({
  imageUrl,
  imageWidth,
  imageHeight,
  grid,
  showGrid,
  calibrating = false,
  onCalibrateRect,
}: MapStageProps) {
  const [containerRef, size] = useSize<HTMLDivElement>()
  const stageRef = useRef<Konva.Stage>(null)
  const image = useImage(imageUrl)
  // null = inquadratura "mappa intera"; diventa un valore appena si sposta o si zooma
  const [manualView, setManualView] = useState<View | null>(null)
  const [draftRect, setDraftRect] = useState<GridRect | null>(null)
  const pinch = useRef<{
    distance: number
    center: { x: number; y: number }
  } | null>(null)

  /** Mappa intera nel riquadro, centrata. */
  const fitted = useMemo<View | null>(() => {
    if (!size.width || !size.height) return null
    const scale = clampScale(Math.min(size.width / imageWidth, size.height / imageHeight) * 0.95)
    return {
      scale,
      x: (size.width - imageWidth * scale) / 2,
      y: (size.height - imageHeight * scale) / 2,
    }
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
    [fitted],
  )

  /** Zoom tenendo fermo un punto dello schermo (il cursore o il centro delle dita). */
  const zoomAt = useCallback(
    (point: { x: number; y: number }, nextScale: number) => {
      setView((current) => {
        const scale = clampScale(nextScale)
        const imagePoint = {
          x: (point.x - current.x) / current.scale,
          y: (point.y - current.y) / current.scale,
        }
        return {
          scale,
          x: point.x - imagePoint.x * scale,
          y: point.y - imagePoint.y * scale,
        }
      })
    },
    [setView],
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

  // Pinch a due dita: distanza tra le dita = zoom, centro = punto fermo
  function handleTouchMove(e: Konva.KonvaEventObject<TouchEvent>) {
    const [a, b] = Array.from(e.evt.touches)
    if (!a || !b) return
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage || !view) return
    if (stage.isDragging()) stage.stopDrag()

    const rect = stage.container().getBoundingClientRect()
    const center = {
      x: (a.clientX + b.clientX) / 2 - rect.left,
      y: (a.clientY + b.clientY) / 2 - rect.top,
    }
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const last = pinch.current
    pinch.current = { distance, center }
    if (!last) return

    setView((current) => {
      const scale = clampScale(current.scale * (distance / last.distance))
      const imagePoint = {
        x: (last.center.x - current.x) / current.scale,
        y: (last.center.y - current.y) / current.scale,
      }
      return {
        scale,
        x: center.x - imagePoint.x * scale,
        y: center.y - imagePoint.y * scale,
      }
    })
  }

  // Calibrazione: punto dell'immagine sotto il dito/cursore
  const imagePointer = () => stageRef.current?.getRelativePointerPosition() ?? null

  function handlePointerDown() {
    if (!calibrating) return
    const p = imagePointer()
    if (p) setDraftRect({ x: p.x, y: p.y, width: 0, height: 0 })
  }

  function handlePointerMove() {
    if (!calibrating || !draftRect) return
    const p = imagePointer()
    if (p)
      setDraftRect({
        ...draftRect,
        width: p.x - draftRect.x,
        height: p.y - draftRect.y,
      })
  }

  function handlePointerUp() {
    if (!calibrating || !draftRect) return
    // Un tocco senza trascinare non conta
    if (Math.abs(draftRect.width) > 4 && Math.abs(draftRect.height) > 4) onCalibrateRect?.(draftRect)
    setDraftRect(null)
  }

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
          draggable={!calibrating}
          onDragEnd={(e) => {
            if (e.target === stageRef.current)
              setView((current) => ({
                ...current,
                x: e.target.x(),
                y: e.target.y(),
              }))
          }}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => (pinch.current = null)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ cursor: calibrating ? "crosshair" : "grab" }}
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

          {calibrating && draftRect && (
            <Layer listening={false}>
              <Rect
                {...draftRect}
                stroke="#AA3E98"
                strokeWidth={2}
                strokeScaleEnabled={false}
                dash={[6, 4]}
                fill="rgba(170, 62, 152, 0.15)"
              />
            </Layer>
          )}
        </Stage>
      )}

      {!image && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Carico la mappa…
        </div>
      )}

      {/* Comandi di zoom: grandi, per il telefono */}
      <div className="absolute right-3 bottom-3 flex flex-col gap-2">
        <Button
          size="icon-lg"
          variant="secondary"
          className="shadow"
          aria-label="Avvicina"
          onClick={() => zoomButton(1.3)}
        >
          <Plus />
        </Button>
        <Button
          size="icon-lg"
          variant="secondary"
          className="shadow"
          aria-label="Allontana"
          onClick={() => zoomButton(1 / 1.3)}
        >
          <Minus />
        </Button>
        <Button
          size="icon-lg"
          variant="secondary"
          className="shadow"
          aria-label="Mostra tutta la mappa"
          onClick={fit}
        >
          <Maximize />
        </Button>
      </div>
    </div>
  )
}
