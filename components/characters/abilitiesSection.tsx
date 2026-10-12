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
    { label: "Percezione passiva", value: 10 + skillBonus(character, "perception", "wis") },
    { label: "Intuizione passiva", value: 10 + skillBonus(character, "insight", "wis") },
    { label: "Indagare passivo", value: 10 + skillBonus(character, "investigation", "int") },
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
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ABILITIES.map((ability) => {
            const proficient = character.savingThrows.includes(ability.key)
            const bonus = savingThrowBonus(character, ability.key)
            return (
              <li
                key={ability.key}
                className={cn(
                  "flex items-center gap-2 rounded-full border bg-secondary/40 py-1 pr-1 pl-3",
                  editing && "pl-1.5"
                )}
              >
                <ProficiencyDot
                  value={proficient ? "proficient" : "none"}
                  editing={editing}
                  label={`Competenza nel tiro salvezza su ${ability.label}`}
                  onClick={() => dispatch({ type: "toggleSave", ability: ability.key })}
                />
                <span className="flex-1 truncate text-xs tracking-widest">{ability.label}</span>
                <RollButton
                  label={`Tiro salvezza su ${ability.label}`}
                  bonus={bonus}
                  className="min-w-10 rounded-full border bg-card px-2 text-center tabular-nums"
                >
                  {signed(bonus)}
                </RollButton>
              </li>
            )
          })}
        </ul>
      </SheetSection>

      <SheetSection title="Sensi">
        <ul className="flex flex-col gap-2">
          {senses.map((sense) => (
            <li key={sense.label} className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md border bg-card tabular-nums">
                {sense.value}
              </span>
              <span>{sense.label}</span>
            </li>
          ))}
        </ul>
      </SheetSection>
    </div>
  )
}
