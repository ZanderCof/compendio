"use client"

import { useId } from "react"
import { motion } from "motion/react"
import { ChevronsDown, ChevronsUp, Equal } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDice, type Advantage } from "./diceProvider"

const OPTIONS: { value: Advantage; label: string; icon: typeof Equal; pill: string }[] = [
  { value: "disadvantage", label: "Svantaggio", icon: ChevronsDown, pill: "bg-destructive/15 ring-1 ring-destructive/40" },
  { value: "normal", label: "Normale", icon: Equal, pill: "bg-secondary ring-1 ring-border" },
  { value: "advantage", label: "Vantaggio", icon: ChevronsUp, pill: "bg-aqua/30 ring-1 ring-aqua/60" },
]

/** Scelta per il prossimo tiro di d20: la pillola scorre sull'opzione scelta. Dopo il tiro torna su "Normale". */
export function AdvantageToggle({ className }: { className?: string }) {
  const { advantage, setAdvantage } = useDice()
  // Più toggle nella stessa pagina (scheda e vassoio dei dadi) non devono condividere la pillola
  const layoutId = `advantage-pill-${useId()}`

  return (
    <div
      role="radiogroup"
      aria-label="Vantaggio o svantaggio sul prossimo tiro"
      className={cn("inline-flex rounded-full border bg-card p-0.5", className)}
    >
      {OPTIONS.map((option) => {
        const active = option.value === advantage
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setAdvantage(option.value)}
            className={cn(
              "font-display relative flex items-center gap-1 rounded-full px-3 py-1 text-sm tracking-wide transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className={cn("absolute inset-0 rounded-full", option.pill)}
                transition={{ type: "spring", stiffness: 450, damping: 34 }}
              />
            )}
            <Icon className="relative size-3.5" />
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
