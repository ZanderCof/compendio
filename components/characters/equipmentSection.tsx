"use client"

import { useState } from "react"
import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCharacter } from "./characterProvider"
import { NumberField } from "./numberField"
import { SheetSection } from "./sheetSection"
import type { Currency } from "@/features/characters/types"

const COINS: { key: keyof Currency; label: string; className: string }[] = [
  { key: "pp", label: "MP", className: "bg-violet/20" },
  { key: "gp", label: "MO", className: "bg-plum/20" },
  { key: "ep", label: "ME", className: "bg-periwinkle/25" },
  { key: "sp", label: "MA", className: "bg-sky/25" },
  { key: "cp", label: "MR", className: "bg-aqua/25" },
]

function AddItemForm() {
  const { dispatch } = useCharacter()
  const [name, setName] = useState("")

  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        dispatch({ type: "addItem", item: { name, quantity: 1 } })
        setName("")
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nuovo oggetto"
        aria-label="Nome del nuovo oggetto"
      />
      <Button type="submit" disabled={!name.trim()}>
        <Plus />
        Aggiungi
      </Button>
    </form>
  )
}

export function EquipmentSection() {
  const { character, dispatch, editing } = useCharacter()

  const totalWeight = character.equipment.reduce(
    (sum, item) => sum + (item.weight ?? 0) * item.quantity,
    0
  )
  // Capacità di trasporto: Forza × 15 libbre
  const capacity = character.abilities.str * 15

  return (
    <SheetSection
      title="Equipaggiamento"
      action={
        <span
          className={cn(
            "text-sm text-muted-foreground",
            totalWeight > capacity && "text-destructive"
          )}
        >
          {totalWeight.toLocaleString("it-IT")} / {capacity} lb
        </span>
      }
    >
      <div className="mb-4 grid grid-cols-5 gap-2">
        {COINS.map((coin) => (
          <label
            key={coin.key}
            className={cn("flex flex-col items-center rounded-lg px-1 py-1.5", coin.className)}
          >
            <NumberField
              label={`Monete: ${coin.label}`}
              value={character.currency[coin.key]}
              min={0}
              onCommit={(value) => dispatch({ type: "setCurrency", coin: coin.key, value })}
              className="h-7 w-full max-w-16 border-transparent bg-card/70 text-base"
            />
            <span className="mt-0.5 text-xs tracking-widest text-muted-foreground">
              {coin.label}
            </span>
          </label>
        ))}
      </div>

      <ul className="grid gap-x-6 sm:grid-cols-2">
        {character.equipment.map((item, index) => (
          <li
            key={`${item.name}-${index}`}
            className="flex items-center gap-1.5 border-b border-border/60 py-1"
          >
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Togli un ${item.name}`}
              disabled={item.quantity === 0}
              onClick={() =>
                dispatch({ type: "setItemQuantity", index, quantity: item.quantity - 1 })
              }
            >
              <Minus />
            </Button>
            <span className="w-6 text-center tabular-nums">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Aggiungi un ${item.name}`}
              onClick={() =>
                dispatch({ type: "setItemQuantity", index, quantity: item.quantity + 1 })
              }
            >
              <Plus />
            </Button>
            <span className={cn("flex-1 truncate", item.quantity === 0 && "text-muted-foreground line-through")}>
              {item.name}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: "toggleEquipped", index })}
              aria-pressed={!!item.equipped}
              className={cn(
                "h-5 rounded-full border px-2 text-xs transition-colors",
                item.equipped
                  ? "border-transparent bg-secondary text-secondary-foreground"
                  : "border-dashed text-muted-foreground hover:text-foreground"
              )}
            >
              Equip.
            </button>
            {editing && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Elimina ${item.name}`}
                className="text-destructive"
                onClick={() => dispatch({ type: "removeItem", index })}
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {editing && <AddItemForm />}
    </SheetSection>
  )
}
