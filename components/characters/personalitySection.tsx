"use client"

import { Separator } from "@/components/ui/separator"
import type { Character } from "@/features/characters/types"
import { useCharacter } from "./characterProvider"
import { SheetSection } from "./sheetSection"

const textareaClass =
  "mt-1 w-full rounded-md border border-primary/40 bg-card px-2 py-1.5 text-sm leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

export function PersonalitySection() {
  const { character, dispatch, editing } = useCharacter()
  const { personality } = character
  const entries: { field: keyof Character["personality"]; label: string }[] = [
    { field: "traits", label: "Tratti" },
    { field: "ideals", label: "Ideali" },
    { field: "bonds", label: "Legami" },
    { field: "flaws", label: "Difetti" },
  ]

  return (
    <SheetSection title="Personalità e Storia">
      <dl className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.field} className="rounded-lg bg-accent/60 p-3">
            <dt className="text-xs tracking-widest text-accent-foreground">{entry.label}</dt>
            <dd className="mt-1">
              {editing ? (
                // Si salva quando esci dal campo, non a ogni lettera
                <textarea
                  defaultValue={personality[entry.field]}
                  onBlur={(e) =>
                    dispatch({ type: "setPersonality", field: entry.field, value: e.target.value })
                  }
                  rows={3}
                  aria-label={entry.label}
                  className={textareaClass}
                />
              ) : (
                personality[entry.field] || <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <Separator className="my-4" />
      <h3 className="text-xs tracking-widest text-muted-foreground">Storia</h3>
      {editing ? (
        <textarea
          defaultValue={character.backstory}
          onBlur={(e) => dispatch({ type: "setBackstory", value: e.target.value })}
          rows={8}
          aria-label="Storia del personaggio"
          className={textareaClass}
        />
      ) : (
        <p className="mt-1 leading-relaxed whitespace-pre-line">
          {character.backstory || <span className="text-muted-foreground">Ancora da scrivere.</span>}
        </p>
      )}
    </SheetSection>
  )
}
