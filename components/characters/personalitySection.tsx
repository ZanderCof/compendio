"use client"

import { Separator } from "@/components/ui/separator"
import { SheetSection } from "./sheetSection"
import { useCharacter } from "./characterProvider"

export function PersonalitySection() {
  const { character } = useCharacter()
  const { personality } = character
  const entries = [
    { label: "Tratti", value: personality.traits },
    { label: "Ideali", value: personality.ideals },
    { label: "Legami", value: personality.bonds },
    { label: "Difetti", value: personality.flaws },
  ]

  return (
    <SheetSection title="Personalità e Storia">
      <dl className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.label} className="rounded-lg bg-accent/60 p-3">
            <dt className="text-xs tracking-widest text-accent-foreground">{entry.label}</dt>
            <dd className="mt-1">{entry.value}</dd>
          </div>
        ))}
      </dl>
      <Separator className="my-4" />
      <p className="leading-relaxed whitespace-pre-line">{character.backstory}</p>
    </SheetSection>
  )
}
