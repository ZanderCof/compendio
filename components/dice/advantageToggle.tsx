"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { useDice, type Advantage } from "./diceProvider"

const OPTIONS: { value: Advantage; label: string }[] = [
  { value: "disadvantage", label: "Svantaggio" },
  { value: "normal", label: "Normale" },
  { value: "advantage", label: "Vantaggio" },
]

/** Scelta per il prossimo tiro di d20: dopo il tiro torna su "Normale". */
export function AdvantageToggle({ className }: { className?: string }) {
  const { advantage, setAdvantage } = useDice()

  return (
    <ToggleGroup
      type="single"
      value={advantage}
      onValueChange={(value) => value && setAdvantage(value as Advantage)}
      variant="outline"
      size="sm"
      spacing={0}
      className={cn("bg-card", className)}
      aria-label="Vantaggio o svantaggio sul prossimo tiro"
    >
      {OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={cn(
            "px-2.5 tracking-wide",
            option.value === "advantage" && "data-[state=on]:bg-aqua/30!",
            option.value === "disadvantage" && "data-[state=on]:bg-destructive/15!",
            option.value === "normal" && "data-[state=on]:bg-secondary!"
          )}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
