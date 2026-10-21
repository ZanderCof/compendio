"use client"

import { useState, useSyncExternalStore } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Dices, EyeOff, Trash2 } from "lucide-react"

import { D20 } from "@/components/brand/d20"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AdvantageToggle } from "./advantageToggle"
import { useDice, type LoggedRoll } from "./diceProvider"
import { pressBounce, rollFeedback } from "./rollButton"
import { RollDice } from "./rollToast"

const DICE = [4, 6, 8, 10, 12, 20, 100]

const timeFormat = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" })

const DESKTOP = "(min-width: 768px)"

/** Vero sugli schermi larghi. Sul server (e al primo render) si parte dal telefono. */
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP)
      query.addEventListener("change", onChange)
      return () => query.removeEventListener("change", onChange)
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false
  )
}

/** L'ultimo tiro in grande: il d20 rotola sul numero uscito, gli altri dadi saltano sul totale. */
function LastRoll({ roll }: { roll: LoggedRoll }) {
  const reduced = useReducedMotion()
  const crit = roll.natural === 20
  const fumble = roll.natural === 1

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-secondary/40 p-3",
        crit && "border-aqua bg-aqua/10",
        fumble && "border-destructive/50 bg-destructive/5"
      )}
    >
      {roll.natural !== null ? (
        <D20 key={roll.id} value={roll.natural} motion="toss" className={cn("size-16 shrink-0", fumble && "grayscale")} />
      ) : (
        <motion.span
          key={roll.id}
          initial={reduced ? false : { rotate: -200, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet to-periwinkle text-primary-foreground shadow-md"
        >
          <Dices className="size-7" />
        </motion.span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate">{roll.label}</p>
        <p className="text-xs text-muted-foreground">{roll.notation}</p>
        <div className="mt-1 text-xs">
          <RollDice roll={roll} />
        </div>
      </div>
      <motion.span
        key={`total-${roll.id}`}
        initial={reduced ? false : { y: -16, opacity: 0, scale: 0.6 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18, delay: reduced ? 0 : 0.35 }}
        className={cn(
          "font-display text-5xl leading-none tabular-nums",
          crit && "text-primary",
          fumble && "text-destructive"
        )}
      >
        {roll.total}
      </motion.span>
    </div>
  )
}

/** Contenuto del vassoio: vantaggio, dadi rapidi, formula libera e cronologia. */
function TrayBody() {
  const { rollD20, rollNotation, history, clearHistory, canHide, hidden, setHidden } = useDice()
  const [notation, setNotation] = useState("")
  const last = history[0]

  async function quickRoll(sides: number, button: HTMLButtonElement) {
    pressBounce(button)
    const result = sides === 20 ? await rollD20("d20", 0) : await rollNotation(`d${sides}`, `d${sides}`)
    rollFeedback(button, result)
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b px-4 pb-4">
        {last && <LastRoll roll={last} />}

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
          {DICE.map((sides) => (
            <Button
              key={sides}
              variant={sides === 20 ? "default" : "secondary"}
              className="h-11 text-base"
              onClick={(e) => quickRoll(sides, e.currentTarget)}
            >
              d{sides}
            </Button>
          ))}
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
            placeholder="es. 2d6+3, 8d6, 4d6kh3"
            aria-label="Formula dei dadi"
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

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {history.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            Nessun tiro ancora. Tocca un valore della scheda o un dado qui sopra.
          </li>
        )}
        <AnimatePresence initial={false}>
          {history.slice(1).map((roll) => (
            <motion.li
              key={roll.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-3 rounded-lg border p-2"
            >
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
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  )
}

/** Pulsante fisso in basso a destra: apre i dadi. Su telefono un foglio dal basso, su desktop un popover. */
export function DiceTray() {
  const { history, hidden, shared } = useDice()
  const desktop = useIsDesktop()

  const trigger = (
    <Button
      size="icon-lg"
      aria-label="Apri i dadi"
      className={cn(
        "fixed right-4 bottom-[calc(1rem+var(--bottom-bar,0px))] z-30 size-14 rounded-full bg-linear-to-br from-plum to-violet shadow-lg ring-4 ring-background transition-transform hover:scale-105 hover:rotate-12",
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
  )

  const description = shared ? "Durante la sessione i tiri li vede tutto il tavolo." : "Tiri liberi e cronologia."

  if (desktop) {
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          className="flex max-h-[min(42rem,calc(100dvh-var(--nav-h)-6rem))] w-96 flex-col gap-0 p-0"
        >
          <div className="px-4 pt-4 pb-3">
            <h2 className="text-xl tracking-wide">Dadi</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <TrayBody />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl">
        {/* Maniglia del foglio */}
        <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="pt-2">
          <SheetTitle className="text-xl tracking-wide">Dadi</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <TrayBody />
      </SheetContent>
    </Sheet>
  )
}
