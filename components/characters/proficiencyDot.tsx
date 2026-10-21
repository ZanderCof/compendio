"use client"

import { cn } from "@/lib/utils"
import type { Proficiency } from "@/features/characters/types"

const TITLES: Record<Proficiency, string> = {
  none: "Nessuna competenza",
  proficient: "Competente",
  expertise: "Maestria",
}

type ProficiencyDotProps = {
  value: Proficiency
  editing: boolean
  label: string
  onClick: () => void
}

/** Pallino di competenza. In modalità modifica diventa un pulsante più grande da toccare. */
export function ProficiencyDot({ value, editing, label, onClick }: ProficiencyDotProps) {
  const dot = (
    <span
      className={cn(
        "block size-2.5 shrink-0 rounded-full border border-muted-foreground/50",
        // Competente: pieno e luminoso; maestria: con un anello in più
        value !== "none" && "border-primary bg-primary shadow-[0_0_8px_1px] shadow-primary/60",
        value === "expertise" && "ring-2 ring-primary/40 ring-offset-1 ring-offset-card"
      )}
    />
  )

  if (!editing) return <span title={TITLES[value]}>{dot}</span>

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${TITLES[value]}`}
      title={TITLES[value]}
      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/60 hover:bg-primary/10"
    >
      {dot}
    </button>
  )
}
