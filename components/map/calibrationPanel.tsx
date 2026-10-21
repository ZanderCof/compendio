"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Grid3x3, LoaderCircle, Save, SquareDashedMousePointer, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type GridDraft = { cellSize: number; offsetX: number; offsetY: number; showGrid: boolean }

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-xs text-muted-foreground">
        {label}
        <span className="tabular-nums text-foreground">{value.toFixed(1)} px</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-full accent-primary"
      />
    </label>
  )
}

/**
 * Calibrazione della griglia: riquadro sopra una cella dell'immagine e regolazioni fini.
 * Su desktop è un riquadro in alto a sinistra; sotto i 1024 px un pannello in basso richiudibile.
 */
export function CalibrationPanel({
  draft,
  onChange,
  drawing,
  onToggleDrawing,
  onSave,
  onCancel,
  saving,
}: {
  draft: GridDraft
  onChange: (draft: GridDraft) => void
  drawing: boolean
  onToggleDrawing: () => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  // Solo su telefono e tablet: si può abbassare per vedere la mappa
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border bg-card/95 p-3 shadow-lg backdrop-blur",
        "max-lg:rounded-t-2xl max-lg:border-b-0 max-lg:pb-4",
        "lg:w-full lg:max-w-sm lg:rounded-xl"
      )}
    >
      <div className="flex items-center gap-2">
        <p className="flex flex-1 items-center gap-2 tracking-wide">
          <Grid3x3 className="size-4 text-primary" />
          Calibra la griglia
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={collapsed ? "Apri il pannello" : "Abbassa il pannello"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <ChevronUp /> : <ChevronDown />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Chiudi la calibrazione" onClick={onCancel}>
          <X />
        </Button>
      </div>

      <div className={cn("flex flex-col gap-3", collapsed && "max-lg:hidden")}>
        {/* Interruttore: acceso = trascinando sulla mappa si disegna la cella invece di spostarla */}
        <button
          type="button"
          aria-pressed={drawing}
          onClick={onToggleDrawing}
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition-colors",
            drawing ? "border-primary bg-primary/15" : "border-border hover:bg-muted"
          )}
        >
          <SquareDashedMousePointer className={cn("size-5 shrink-0", drawing ? "text-primary" : "text-muted-foreground")} />
          <span className="flex-1">
            <span className="block text-sm tracking-wide">Disegna una cella</span>
            <span className="block text-xs text-muted-foreground">
              {drawing ? "Trascina sopra una cella della mappa" : "Spento: trascinando sposti la mappa"}
            </span>
          </span>
          {/* Interruttore visivo */}
          <span
            aria-hidden
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
              drawing ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                drawing ? "translate-x-5.5" : "translate-x-0.5"
              )}
            />
          </span>
        </button>

        <Slider
          label="Dimensione cella"
          value={draft.cellSize}
          min={8}
          max={300}
          step={0.5}
          onChange={(cellSize) => onChange({ ...draft, cellSize })}
        />
        <Slider
          label="Spostamento orizzontale"
          value={draft.offsetX}
          min={0}
          max={draft.cellSize}
          step={0.5}
          onChange={(offsetX) => onChange({ ...draft, offsetX })}
        />
        <Slider
          label="Spostamento verticale"
          value={draft.offsetY}
          min={0}
          max={draft.cellSize}
          step={0.5}
          onChange={(offsetY) => onChange({ ...draft, offsetY })}
        />

        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.showGrid}
            onChange={(e) => onChange({ ...draft, showGrid: e.target.checked })}
            className="size-5 accent-primary"
          />
          Mostra la griglia a tutti
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="lg" onClick={onCancel} disabled={saving}>
            Annulla
          </Button>
          <Button size="lg" onClick={onSave} disabled={saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
            Salva griglia
          </Button>
        </div>
      </div>
    </div>
  )
}
