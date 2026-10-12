"use client"

import { useState } from "react"
import { Heart, Shield, Sword } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCharacter } from "./characterProvider"

/** Popup per danni, cure e PF temporanei. Si apre toccando i punti ferita. */
export function HpEditor({ children }: { children: React.ReactNode }) {
  const { character, dispatch } = useCharacter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")

  const value = Math.trunc(Number(amount))
  const valid = amount.trim() !== "" && Number.isFinite(value) && value > 0

  function apply(type: "damage" | "heal" | "setTempHp") {
    if (!valid) return
    dispatch({ type, amount: value })
    setAmount("")
    setOpen(false)
  }

  const { current, max, temp } = character.hitPoints

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="text-center text-sm text-muted-foreground">
          PF {current}/{max}
          {temp > 0 && ` · ${temp} temporanei`}
        </p>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          autoFocus
          placeholder="Quantità"
          aria-label="Quantità di punti ferita"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply("damage")}
          className="h-10 text-center text-lg"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="destructive" disabled={!valid} onClick={() => apply("damage")}>
            <Sword />
            Danno
          </Button>
          <Button disabled={!valid} onClick={() => apply("heal")}>
            <Heart />
            Cura
          </Button>
        </div>
        <Button variant="outline" disabled={!valid} onClick={() => apply("setTempHp")}>
          <Shield />
          Imposta PF temporanei
        </Button>
      </PopoverContent>
    </Popover>
  )
}
