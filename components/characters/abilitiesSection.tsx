"use client"

import { RollButton } from "@/components/dice/rollButton"
import { cn } from "@/lib/utils"
import { useCharacter } from "./characterProvider"
import { PointsCard } from "./pointsCard"
import { ProficiencyDot } from "./proficiencyDot"
import { SheetSection } from "./sheetSection"
import { ABILITIES, savingThrowBonus, signed, skillBonus } from "@/features/characters/rules"

/** Caratteristiche, tiri salvezza e sensi: il primo pannello della scheda. */
export function AbilitiesSection() {
  const { character, dispatch, editing } = useCharacter()

  const senses = [
    { label: "Percezione passiva", rollLabel: "Percezione", value: 10 + skillBonus(character, "perception", "wis") },
    { label: "Intuizione passiva", rollLabel: "Intuizione", value: 10 + skillBonus(character, "insight", "wis") },
    { label: "Indagare passivo", rollLabel: "Indagare", value: 10 + skillBonus(character, "investigation", "int") },
  ]

  return (
    <div className="flex flex-col gap-4">
      <SheetSection title="Caratteristiche">
        <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-6">
          {ABILITIES.map((ability) => (
            <PointsCard
              key={ability.key}
              label={ability.label}
              score={character.abilities[ability.key]}
              editing={editing}
              onScoreChange={(score) =>
                dispatch({ type: "setAbility", ability: ability.key, score })
              }
            />
          ))}
        </div>
      </SheetSection>

      <SheetSection title="Tiri Salvezza">
        <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {ABILITIES.map((ability) => {
            const proficient = character.savingThrows.includes(ability.key)
            const bonus = savingThrowBonus(character, ability.key)
            return (
              <li key={ability.key} className="flex items-center gap-2 border-b border-border/60 last:border-0 sm:[&:nth-last-child(2)]:border-0">
                <ProficiencyDot
                  value={proficient ? "proficient" : "none"}
                  editing={editing}
                  label={`Competenza nel tiro salvezza su ${ability.label}`}
                  onClick={() => dispatch({ type: "toggleSave", ability: ability.key })}
                />
                {/* Tutta la riga tira; il valore sta in colonna a destra */}
                <RollButton
                  label={`Tiro salvezza su ${ability.label}`}
                  bonus={bonus}
                  className="flex flex-1 items-center gap-2 py-1.5 pr-1 text-left"
                >
                  <span className={cn("flex-1", proficient && "text-foreground")}>{ability.label}</span>
                  <span
                    className={cn(
                      "w-10 rounded-md border bg-card py-0.5 text-center tabular-nums",
                      proficient && "border-primary/50 text-primary"
                    )}
                  >
                    {signed(bonus)}
                  </span>
                </RollButton>
              </li>
            )
          })}
        </ul>
      </SheetSection>

      <SheetSection title="Sensi">
        <ul className="flex flex-col">
          {senses.map((sense) => (
            <li key={sense.label} className="border-b border-border/60 last:border-0">
              {/* Il valore è passivo; toccando la riga si tira la prova attiva */}
              <RollButton
                label={sense.rollLabel}
                bonus={sense.value - 10}
                className="flex w-full items-center gap-3 py-1.5 pr-1 text-left"
              >
                <span className="w-10 rounded-md border bg-card py-0.5 text-center tabular-nums">{sense.value}</span>
                <span className="flex-1">{sense.label}</span>
                <span className="text-xs text-muted-foreground">tira {signed(sense.value - 10)}</span>
              </RollButton>
            </li>
          ))}
        </ul>
      </SheetSection>
    </div>
  )
}
