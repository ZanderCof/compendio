"use client"

import { Badge } from "@/components/ui/badge"
import { SheetSection } from "./sheetSection"
import { useCharacter } from "./characterProvider"

export function FeaturesSection() {
  const { character } = useCharacter()
  return (
    <SheetSection title="Privilegi e Tratti">
      <ul className="flex flex-col gap-3">
        {character.features.map((feature) => (
          <li key={feature.name}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="tracking-wide">{feature.name}</h3>
              <Badge variant="outline">{feature.source}</Badge>
            </div>
            <p className="mt-0.5 text-muted-foreground">{feature.description}</p>
          </li>
        ))}
      </ul>
    </SheetSection>
  )
}

export function ProficienciesSection() {
  const { character } = useCharacter()
  const groups = [
    { label: "Armature", items: character.proficiencies.armor },
    { label: "Armi", items: character.proficiencies.weapons },
    { label: "Strumenti", items: character.proficiencies.tools },
    { label: "Lingue", items: character.proficiencies.languages },
  ]

  return (
    <SheetSection title="Competenze e Lingue">
      <dl className="flex flex-col gap-2">
        {groups.map((group) => (
          <div key={group.label}>
            <dt className="text-xs tracking-widest text-muted-foreground">{group.label}</dt>
            <dd>{group.items.length > 0 ? group.items.join(", ") : "—"}</dd>
          </div>
        ))}
      </dl>
    </SheetSection>
  )
}
