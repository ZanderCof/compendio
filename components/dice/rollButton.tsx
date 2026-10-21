"use client"

import { useRef } from "react"
import gsap from "gsap"

import { burstFromElement } from "@/components/effects/sparks"
import { cn } from "@/lib/utils"
import type { Dice } from "@/features/dice/dice"
import { useDice, type LoggedRoll } from "./diceProvider"

type RollButtonProps = Omit<React.ComponentProps<"button">, "onClick"> & {
  label: string
} & ({ bonus: number; dice?: never } | { dice: Dice; bonus?: never })

/** Rimbalzo al tocco e scintille su 20 naturale (o pioggia grigia su 1). Niente con "riduci movimento". */
export function rollFeedback(element: HTMLElement | null, result: LoggedRoll | null) {
  if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  if (!result) return
  if (result.natural === 20) burstFromElement(element, "crit")
  else if (result.natural === 1) burstFromElement(element, "fumble")
}

export function pressBounce(element: HTMLElement | null) {
  if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  gsap.fromTo(element, { scale: 0.92 }, { scale: 1, duration: 0.45, ease: "back.out(4)", overwrite: true })
}

/**
 * Pulsante che tira un dado al tocco.
 * Con `bonus` tira un d20 (rispettando vantaggio/svantaggio), con `dice` tira quei dadi.
 */
export function RollButton({ label, bonus, dice, className, children, ...props }: RollButtonProps) {
  const { rollD20, rollDice } = useDice()
  const ref = useRef<HTMLButtonElement>(null)

  async function handleClick() {
    pressBounce(ref.current)
    const result = await (dice ? rollDice(label, dice) : rollD20(label, bonus!))
    rollFeedback(ref.current, result)
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      title={`Tira: ${label}`}
      className={cn(
        "cursor-pointer rounded-md transition-colors hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
