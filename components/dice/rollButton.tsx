"use client"

import { cn } from "@/lib/utils"
import type { Dice } from "@/features/dice/dice"
import { useDice } from "./diceProvider"

type RollButtonProps = Omit<React.ComponentProps<"button">, "onClick"> & {
  label: string
} & ({ bonus: number; dice?: never } | { dice: Dice; bonus?: never })

/**
 * Pulsante che tira un dado al tocco.
 * Con `bonus` tira un d20 (rispettando vantaggio/svantaggio), con `dice` tira quei dadi.
 */
export function RollButton({ label, bonus, dice, className, children, ...props }: RollButtonProps) {
  const { rollD20, rollDice } = useDice()

  return (
    <button
      type="button"
      onClick={() => (dice ? rollDice(label, dice) : rollD20(label, bonus!))}
      title={`Tira: ${label}`}
      className={cn(
        "cursor-pointer rounded-md transition-colors hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.97]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
