"use client"

import { Dices, EyeOff } from "lucide-react"

import { DiceProvider, useDice } from "@/components/dice/diceProvider"
import { DiceTray } from "@/components/dice/diceTray"
import { Button } from "@/components/ui/button"

const QUICK_DICE = [4, 6, 8, 10, 12, 20]

function QuickDice() {
  const { rollD20, rollNotation, hidden, setHidden } = useDice()
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-6 gap-2">
        {QUICK_DICE.map((sides) => (
          <Button
            key={sides}
            variant="secondary"
            className="h-11 text-base"
            onClick={() => (sides === 20 ? rollD20("d20", 0) : rollNotation(`d${sides}`, `d${sides}`))}
          >
            d{sides}
          </Button>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="accent-primary" />
        <EyeOff className="size-4" />
        Tiro nascosto: i giocatori non lo vedono nel feed
      </label>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Dices className="size-3.5" />
        Per tiri come 8d6+3 usa il pulsante dadi in basso a destra.
      </p>
    </div>
  )
}

/** Dadi del master: tutti i tiri vanno nel feed, a meno che non siano nascosti. */
export function MasterDice({ campaignId }: { campaignId: string }) {
  return (
    <DiceProvider campaignId={campaignId} canHide>
      <QuickDice />
      <DiceTray />
    </DiceProvider>
  )
}
