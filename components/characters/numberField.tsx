"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

type NumberFieldProps = {
  value: number
  onCommit: (value: number) => void
  label: string
  className?: string
  min?: number
  max?: number
}

/**
 * Campo numerico che salva quando esci dal campo o premi Invio.
 * Così mentre scrivi "15" non passa per "1" e non viene corretto a metà.
 */
export function NumberField({ value, onCommit, label, className, min, max }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const parsed = Number(draft)
    if (draft.trim() !== "" && Number.isFinite(parsed) && parsed !== value) onCommit(parsed)
    setDraft(null)
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={min}
      max={max}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") {
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
      className={cn(
        "w-14 rounded-md border border-primary/50 bg-card px-1 text-center tabular-nums outline-none [appearance:textfield] focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
    />
  )
}
