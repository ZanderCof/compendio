"use client"

import { Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SheetSection } from "./sheetSection"
import { useCharacter } from "./characterProvider"
import { AddFeatureForm } from "./editForms"

export function FeaturesSection() {
  const { character, dispatch, editing } = useCharacter()
  return (
    <SheetSection title="Privilegi e Tratti">
      {character.features.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nessun privilegio. {editing ? "Aggiungine uno qui sotto." : "Premi “Modifica” per aggiungerne."}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {character.features.map((feature, index) => (
          <li key={`${feature.name}-${index}`}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="tracking-wide">{feature.name}</h3>
              <Badge variant="outline">{feature.source}</Badge>
              {editing && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="ml-auto text-destructive"
                  aria-label={`Elimina ${feature.name}`}
                  onClick={() => dispatch({ type: "removeFeature", index })}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            <p className="mt-0.5 text-muted-foreground">{feature.description}</p>
          </li>
        ))}
      </ul>
      {editing && <AddFeatureForm />}
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
