"use client"

import { useRef } from "react"
import { Dices } from "lucide-react"

import { pressBounce, rollFeedback } from "@/components/dice/rollButton"
import { useDice } from "@/components/dice/diceProvider"
import { abilityModifier, signed } from "@/features/characters/rules"
import { cn } from "@/lib/utils"
import { NumberField } from "./numberField"

type PointsCardProps = {
  label: string
  score: number
  editing: boolean
  onScoreChange: (score: number) => void
}

const FRAME = "flex w-full flex-col items-center rounded-t-xl rounded-b-3xl border-2 border-violet/40 bg-secondary/50 px-2 pt-2 pb-5"

/**
 * Riquadro di una caratteristica: nome, modificatore grande e punteggio nel cerchio sotto.
 * Toccando il riquadro si tira una prova (d20 + modificatore); in modifica si cambia il punteggio.
 */
export function PointsCard({ label, score, editing, onScoreChange }: PointsCardProps) {
  const { rollD20 } = useDice()
  const ref = useRef<HTMLButtonElement>(null)
  const modifier = abilityModifier(score)

  if (editing) {
    return (
      <div className="flex flex-col items-center">
        <div className={FRAME}>
          <span className="w-full truncate text-center text-xs tracking-wide">{label}</span>
          <span className="mt-1 w-full max-w-20 rounded-md border bg-card py-1 text-center text-3xl leading-none">
            {signed(modifier)}
          </span>
        </div>
        <NumberField
          label={`Punteggio di ${label}`}
          value={score}
          min={1}
          max={30}
          onCommit={onScoreChange}
          className="-mt-4 h-9 w-12 rounded-full border-2 text-base"
        />
      </div>
    )
  }

  async function roll() {
    pressBounce(ref.current)
    rollFeedback(ref.current, await rollD20(`Prova di ${label}`, modifier))
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={roll}
      aria-label={`Tira una prova di ${label}: ${signed(modifier)}`}
      className="group flex cursor-pointer flex-col items-center rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        className={cn(
          FRAME,
          "transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-violet group-hover:shadow-[0_6px_20px_-6px_rgba(147,104,183,0.6)]"
        )}
      >
        <span className="w-full truncate text-center text-xs tracking-wide">{label}</span>
        <span className="relative mt-1 w-full max-w-20 rounded-md border bg-card py-1 text-center text-3xl leading-none">
          {signed(modifier)}
          {/* Il dado compare al passaggio: "toccami per tirare" */}
          <Dices className="absolute -top-2 -right-2 size-4 rounded-full bg-primary p-0.5 text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </span>
      </span>
      <span className="-mt-4 flex size-9 items-center justify-center rounded-full border-2 border-violet/40 bg-card text-base tabular-nums">
        {score}
      </span>
    </button>
  )
}
