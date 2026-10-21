"use client"

import { useState } from "react"
import {
  BrickWall,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  DoorClosed,
  Eraser,
  Hand,
  LoaderCircle,
  Mountain,
  PenTool,
  Redo2,
  Square,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { EditTool } from "@/features/maps/editor"
import type { SaveStatus } from "./useMapEditor"

const TOOLS: { value: EditTool; label: string; hint: string; icon: typeof Hand }[] = [
  { value: "pan", label: "Sposta", hint: "Trascina per spostare la mappa", icon: Hand },
  { value: "block", label: "Blocca", hint: "Celle non attraversabili: colonne, massi, acqua profonda", icon: Square },
  { value: "difficult", label: "Difficile", hint: "Terreno difficile: costa il doppio del movimento", icon: Mountain },
  { value: "wall", label: "Muro", hint: "Tocca o trascina lungo i bordi delle celle", icon: BrickWall },
  { value: "door", label: "Porta", hint: "Tocca un bordo: diventa porta (o torna muro)", icon: DoorClosed },
  { value: "erase", label: "Gomma", hint: "Toglie celle, muri e porte", icon: Eraser },
]

const STATUS = {
  saved: { icon: Check, label: "Salvato", className: "text-muted-foreground" },
  saving: { icon: LoaderCircle, label: "Salvataggio…", className: "text-muted-foreground [&_svg]:animate-spin" },
  error: { icon: CircleAlert, label: "Non salvato", className: "text-destructive" },
} as const

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-primary" />
      {label}
    </label>
  )
}

export function MapEditorToolbar({
  tool,
  onTool,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  saveStatus,
  showObstacles,
  onShowObstacles,
  playersOpenDoors,
  onPlayersOpenDoors,
  onDone,
}: {
  tool: EditTool
  onTool: (tool: EditTool) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  saveStatus: SaveStatus
  showObstacles: boolean
  onShowObstacles: (value: boolean) => void
  playersOpenDoors: boolean
  onPlayersOpenDoors: (value: boolean) => void
  onDone: () => void
}) {
  // Solo sotto i 1024 px: il pannello si abbassa lasciando visibili gli strumenti
  const [collapsed, setCollapsed] = useState(false)
  const status = STATUS[saveStatus]
  const current = TOOLS.find((t) => t.value === tool)!

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
          <PenTool className="size-4 text-primary" />
          Modifica mappa
        </p>
        <span className={cn("flex items-center gap-1 text-xs", status.className)} role="status">
          <status.icon className="size-3.5" />
          {status.label}
        </span>
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
      </div>

      {/* Strumenti: sempre visibili, anche col pannello abbassato */}
      <div className="grid grid-cols-6 gap-1" role="group" aria-label="Strumenti">
        {TOOLS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={tool === t.value}
            aria-label={t.label}
            title={t.hint}
            onClick={() => onTool(t.value)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg border-2 text-xs transition-colors",
              tool === t.value ? "border-primary bg-primary/15 text-foreground" : "border-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            <t.icon className="size-5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className={cn("flex flex-col gap-3", collapsed && "max-lg:hidden")}>
        <p className="text-xs text-muted-foreground">{current.hint}</p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onUndo} disabled={!canUndo} aria-label="Annulla" title="Annulla (Ctrl+Z)">
            <Undo2 />
            Annulla
          </Button>
          <Button variant="outline" onClick={onRedo} disabled={!canRedo} aria-label="Ripeti" title="Ripeti (Ctrl+Y)">
            <Redo2 />
            Ripeti
          </Button>
        </div>

        <div className="flex flex-col border-t pt-2">
          <Toggle checked={showObstacles} onChange={onShowObstacles} label="Mostra ostacoli ai giocatori" />
          <Toggle checked={playersOpenDoors} onChange={onPlayersOpenDoors} label="I giocatori aprono le porte" />
        </div>

        <Button size="lg" onClick={onDone}>
          <Check />
          Fine
        </Button>
      </div>
    </div>
  )
}
