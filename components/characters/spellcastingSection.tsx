"use client"

import { RollButton } from "@/components/dice/rollButton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useCharacter } from "./characterProvider"
import { SheetSection } from "./sheetSection"
import {
  abilityLabel,
  signed,
  spellAttackBonus,
  spellSaveDC,
} from "@/features/characters/rules"

type SlotPipsProps = {
  level: number
  total: number
  used: number
  onChange: (used: number) => void
}

/** Rombi degli slot: pieno = disponibile. Tocchi un rombo pieno per spenderlo, uno vuoto per recuperarlo. */
function SlotPips({ level, total, used, onChange }: SlotPipsProps) {
  const available = total - used
  return (
    <span className="flex gap-1.5" aria-label={`${available} slot di livello ${level} su ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const isAvailable = i < available
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(isAvailable ? used + 1 : used - 1)}
            aria-label={isAvailable ? "Spendi uno slot" : "Recupera uno slot"}
            className={cn(
              "size-3.5 rotate-45 border border-violet transition-colors",
              isAvailable ? "bg-violet hover:bg-violet/70" : "hover:bg-violet/30"
            )}
          />
        )
      })}
    </span>
  )
}

export function SpellcastingSection() {
  const { character, dispatch } = useCharacter()
  const spellcasting = character.spellcasting
  if (!spellcasting) return null

  const levels = [...new Set(spellcasting.spells.map((s) => s.level))].sort((a, b) => a - b)
  const attack = spellAttackBonus(character, spellcasting.ability)

  return (
    <SheetSection
      title="Incantesimi"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Caratteristica {abilityLabel(spellcasting.ability)}</Badge>
          <Badge variant="outline">CD {spellSaveDC(character, spellcasting.ability)}</Badge>
          <RollButton label="Attacco con incantesimo" bonus={attack} className="rounded-full">
            <Badge variant="outline" className="cursor-pointer hover:border-primary">
              Attacco {signed(attack)}
            </Badge>
          </RollButton>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {levels.map((level) => {
          const slot = spellcasting.slots.find((s) => s.level === level)
          const spells = spellcasting.spells.filter((s) => s.level === level)
          return (
            <div key={level} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="tracking-wide text-violet">
                  {level === 0 ? "Trucchetti" : `Livello ${level}`}
                </h3>
                {slot && (
                  <SlotPips
                    level={level}
                    total={slot.total}
                    used={slot.used}
                    onChange={(used) => dispatch({ type: "setSlotUsed", level, used })}
                  />
                )}
              </div>
              <ul className="flex flex-col gap-0.5">
                {spells.map((spell) => (
                  <li key={spell.name}>
                    {level === 0 ? (
                      <span className="flex items-center gap-2 py-0.5">{spell.name}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "toggleSpellPrepared", name: spell.name })}
                        aria-pressed={!!spell.prepared}
                        title={spell.prepared ? "Preparato: tocca per togliere" : "Tocca per preparare"}
                        className={cn(
                          "flex w-full items-center gap-2 rounded py-0.5 text-left hover:bg-muted",
                          !spell.prepared && "text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full border",
                            spell.prepared && "border-primary bg-primary"
                          )}
                        />
                        {spell.name}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </SheetSection>
  )
}
