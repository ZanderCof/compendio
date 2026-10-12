"use client"

import { RollButton } from "@/components/dice/rollButton"
import { abilityModifier, signed } from "@/features/characters/rules"
import { NumberField } from "./numberField"

type PointsCardProps = {
  label: string
  score: number
  editing: boolean
  onScoreChange: (score: number) => void
}

/**
 * Riquadro di una caratteristica: nome, modificatore grande e punteggio nel cerchio sotto.
 * Toccando il modificatore si tira una prova di caratteristica.
 */
export function PointsCard({ label, score, editing, onScoreChange }: PointsCardProps) {
  const modifier = abilityModifier(score)

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full flex-col items-center rounded-t-xl rounded-b-3xl border-2 border-violet/40 bg-secondary/50 px-2 pt-2 pb-5">
        <span className="truncate text-[0.7rem] tracking-widest">{label}</span>
        <RollButton
          label={`Prova di ${label}`}
          bonus={modifier}
          className="mt-1 w-full max-w-20 border bg-card py-1 text-center text-3xl leading-none"
        >
          {signed(modifier)}
        </RollButton>
      </div>
      {editing ? (
        <NumberField
          label={`Punteggio di ${label}`}
          value={score}
          min={1}
          max={30}
          onCommit={onScoreChange}
          className="-mt-4 h-9 w-12 rounded-full border-2 text-base"
        />
      ) : (
        <span className="-mt-4 flex size-9 items-center justify-center rounded-full border-2 border-violet/40 bg-card text-base tabular-nums">
          {score}
        </span>
      )}
    </div>
  )
}
