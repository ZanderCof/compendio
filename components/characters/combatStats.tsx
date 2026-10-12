"use client"

import { BedDouble, Dices, HeartPulse } from "lucide-react"
import { toast } from "sonner"

import { useDice } from "@/components/dice/diceProvider"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { abilityModifier } from "@/features/characters/rules"
import { useCharacter } from "./characterProvider"
import { HpEditor } from "./hpEditor"
import { NumberField } from "./numberField"
import { SheetSection } from "./sheetSection"

type PipsProps = {
  filled: number
  total: number
  filledClassName: string
  label: string
  onChange: (value: number) => void
}

/** Pallini cliccabili: tocchi il terzo e ne segni tre, ritocchi l'ultimo segnato e torni indietro di uno. */
function Pips({ filled, total, filledClassName, label, onChange }: PipsProps) {
  return (
    <span className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${label}: ${i + 1}`}
          onClick={() => onChange(filled === i + 1 ? i : i + 1)}
          className={cn(
            "size-4 rounded-full border transition-colors",
            i < filled ? filledClassName : "hover:bg-muted"
          )}
        />
      ))}
    </span>
  )
}

/** Punti ferita, dadi vita, tiri contro la morte e riposo lungo. */
export function CombatStats() {
  const { character, dispatch, editing } = useCharacter()
  const { rollD20, rollDice } = useDice()
  const { hitPoints, hitDice, deathSaves } = character
  const hpPercent = Math.round((hitPoints.current / hitPoints.max) * 100)
  const hitDiceLeft = hitDice.total - hitDice.used
  const dying = hitPoints.current === 0

  function spendHitDie() {
    const conMod = abilityModifier(character.abilities.con)
    const result = rollDice("Dado vita", {
      count: 1,
      sides: hitDice.die,
      mode: null,
      keep: null,
      modifier: conMod,
    })
    dispatch({ type: "useHitDie", healed: Math.max(0, result.total) })
  }

  function rollDeathSave() {
    const result = rollD20("Tiro contro la morte", 0)
    dispatch({ type: "deathSaveRoll", natural: result.natural ?? result.total })
  }

  function longRest() {
    dispatch({ type: "longRest" })
    toast.success("Riposo lungo completato", {
      description: "PF, slot incantesimo e metà dei dadi vita recuperati.",
    })
  }

  return (
    <SheetSection
      title="Salute"
      action={
        <Button variant="outline" size="sm" onClick={longRest}>
          <BedDouble />
          Riposo lungo
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-2xl">
            {hitPoints.current}
            <span className="text-base text-muted-foreground">
              {" / "}
              {editing ? (
                <NumberField
                  label="PF massimi"
                  value={hitPoints.max}
                  min={1}
                  onCommit={(value) => dispatch({ type: "setMaxHp", value })}
                  className="h-7 text-base"
                />
              ) : (
                hitPoints.max
              )}
            </span>
            {hitPoints.temp > 0 && (
              <span className="ml-2 text-base text-violet">+{hitPoints.temp} temp</span>
            )}
          </span>
          <HpEditor>
            <Button size="sm">
              <HeartPulse />
              Danno / Cura
            </Button>
          </HpEditor>
        </div>
        <Progress value={hpPercent} className="h-2" aria-label="Punti ferita" />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="text-xs tracking-widest text-muted-foreground">Dadi vita</p>
            <p className="tabular-nums">
              {hitDiceLeft}/{hitDice.total} d{hitDice.die}
            </p>
          </div>
          <Button variant="secondary" size="sm" disabled={hitDiceLeft === 0} onClick={spendHitDie}>
            <Dices />
            Usa un dado vita
          </Button>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
            dying && "border-destructive/50 bg-destructive/5"
          )}
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs tracking-widest text-muted-foreground">Tiri contro la morte</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2">
                Successi
                <Pips
                  filled={deathSaves.successes}
                  total={3}
                  filledClassName="border-aqua bg-aqua"
                  label="Successi"
                  onChange={(successes) =>
                    dispatch({ type: "setDeathSaves", successes, failures: deathSaves.failures })
                  }
                />
              </span>
              <span className="flex items-center gap-2">
                Fallimenti
                <Pips
                  filled={deathSaves.failures}
                  total={3}
                  filledClassName="border-destructive bg-destructive"
                  label="Fallimenti"
                  onChange={(failures) =>
                    dispatch({ type: "setDeathSaves", successes: deathSaves.successes, failures })
                  }
                />
              </span>
            </div>
          </div>
          <Button
            variant={dying ? "destructive" : "outline"}
            size="sm"
            disabled={!dying}
            onClick={rollDeathSave}
            title={dying ? undefined : "Disponibile solo a 0 punti ferita"}
          >
            <Dices />
            Tira
          </Button>
        </div>
      </div>
    </SheetSection>
  )
}
