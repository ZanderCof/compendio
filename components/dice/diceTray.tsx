"use client"

import { useState } from "react"
import { Dices, EyeOff, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AdvantageToggle } from "./advantageToggle"
import { useDice } from "./diceProvider"
import { RollDice } from "./rollToast"

const DICE = [4, 6, 8, 10, 12, 20, 100]

const timeFormat = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" })

/** Pulsante fisso in basso a destra: apre il lanciadadi libero e la cronologia dei tiri. */
export function DiceTray() {
  const { rollD20, rollNotation, history, clearHistory, canHide, hidden, setHidden, shared } = useDice()
  const [notation, setNotation] = useState("")

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon-lg"
          aria-label="Apri i dadi"
          className={cn(
            "fixed right-4 bottom-4 z-30 size-14 rounded-full bg-linear-to-br from-plum to-violet shadow-lg ring-4 ring-background",
            hidden && "from-muted-foreground to-foreground/70"
          )}
        >
          <Dices className="size-7" />
          {history.length > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-aqua text-xs text-foreground">
              {Math.min(history.length, 99)}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl tracking-wide">Dadi</SheetTitle>
          <SheetDescription>
            {shared ? "Durante la sessione i tiri li vede tutto il tavolo." : "Tiri liberi e cronologia."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 border-b px-4 pb-4">
          <AdvantageToggle className="self-center" />

          {canHide && (
            <label className="flex cursor-pointer items-center justify-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hidden}
                onChange={(e) => setHidden(e.target.checked)}
                className="accent-primary"
              />
              <EyeOff className="size-4" />
              Tiro nascosto (lo vedi solo tu)
            </label>
          )}

          <div className="grid grid-cols-4 gap-2">
            {DICE.map((sides) =>
              sides === 20 ? (
                <Button key={sides} variant="secondary" className="h-11 text-base" onClick={() => rollD20("d20", 0)}>
                  d20
                </Button>
              ) : (
                <Button
                  key={sides}
                  variant="secondary"
                  className="h-11 text-base"
                  onClick={() => rollNotation(`d${sides}`, `d${sides}`)}
                >
                  d{sides}
                </Button>
              )
            )}
          </div>

          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (await rollNotation("Tiro libero", notation)) setNotation("")
            }}
          >
            <Input
              value={notation}
              onChange={(e) => setNotation(e.target.value)}
              placeholder="es. 8d6+3, 4d6kh3"
              aria-label="Notazione dei dadi"
              className="h-10"
            />
            <Button type="submit" className="h-10" disabled={!notation.trim()}>
              Tira
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-between px-4 pt-3">
          <h3 className="text-xs tracking-widest text-muted-foreground">Cronologia</h3>
          {history.length > 0 && (
            <Button variant="ghost" size="xs" onClick={clearHistory}>
              <Trash2 />
              Svuota
            </Button>
          )}
        </div>

        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          {history.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              Nessun tiro ancora. Tocca un valore della scheda o un dado qui sopra.
            </li>
          )}
          {history.map((roll) => (
            <li key={roll.id} className="flex items-center gap-3 rounded-lg border p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate">{roll.label}</p>
                <p className="text-xs text-muted-foreground">
                  {roll.notation} · {timeFormat.format(roll.at)}
                </p>
                <div className="mt-1 text-xs">
                  <RollDice roll={roll} />
                </div>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-xl tabular-nums">
                {roll.total}
              </span>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
