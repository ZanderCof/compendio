"use client"

import { Dices } from "lucide-react"

import { DiceProvider, useDice } from "@/components/dice/diceProvider"
import { RollDice } from "@/components/dice/rollToast"
import { Button } from "@/components/ui/button"

function DiceTestButton() {
  const { rollD20, history } = useDice()
  const last = history[0]

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        size="lg"
        onClick={() => rollD20("Tiro di prova", 0)}
        className="size-32 flex-col gap-2 rounded-2xl bg-linear-to-br from-plum to-violet text-xl shadow-lg"
      >
        <Dices className="size-10" />
        Tira d20
      </Button>
      {last && (
        <p className="flex items-center gap-2 text-muted-foreground">
          Ultimo tiro: <RollDice roll={last} /> → <span className="text-2xl text-foreground">{last.total}</span>
        </p>
      )}
    </div>
  )
}

/** Segnaposto della pagina di gioco: per ora solo un tiro di prova. */
export function DiceTest() {
  return (
    <DiceProvider>
      <DiceTestButton />
    </DiceProvider>
  )
}
