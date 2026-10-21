import { D20 } from "@/components/brand/d20"
import { cn } from "@/lib/utils"
import { signed } from "@/features/characters/rules"
import type { LoggedRoll } from "./diceProvider"

/** Dadi tirati, con quelli scartati (vantaggio/svantaggio) barrati. */
export function RollDice({ roll }: { roll: LoggedRoll }) {
  // Conta quante volte compare ogni valore tenuto, per marcare gli scartati anche con valori ripetuti
  const keptLeft = new Map<number, number>()
  for (const value of roll.kept) keptLeft.set(value, (keptLeft.get(value) ?? 0) + 1)

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {roll.rolls.map((value, i) => {
        const left = keptLeft.get(value) ?? 0
        const kept = left > 0
        if (kept) keptLeft.set(value, left - 1)
        return (
          <span
            key={i}
            className={cn(
              "min-w-6 rounded border px-1 text-center tabular-nums",
              kept ? "bg-card" : "text-muted-foreground line-through opacity-60"
            )}
          >
            {value}
          </span>
        )
      })}
      {roll.modifier !== 0 && <span className="tabular-nums">{signed(roll.modifier)}</span>}
    </span>
  )
}

export function RollToast({ roll }: { roll: LoggedRoll }) {
  const crit = roll.natural === 20
  const fumble = roll.natural === 1

  return (
    <div
      className={cn(
        "flex w-(--width) items-center gap-4 rounded-xl border bg-popover p-3 font-sans text-popover-foreground shadow-lg",
        crit && "border-aqua ring-2 ring-aqua/40",
        fumble && "border-destructive ring-2 ring-destructive/30"
      )}
    >
      {/* Per i tiri di d20: il dado rotola e si posa sul numero uscito */}
      {roll.natural !== null && (
        <D20 value={roll.natural} motion="toss" className={cn("size-14 shrink-0", fumble && "grayscale")} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base tracking-wide">
          {roll.label}
          {roll.hidden && <span className="ml-2 text-xs text-muted-foreground">· nascosto</span>}
        </p>
        <p className="text-xs text-muted-foreground">{roll.notation}</p>
        <div className="mt-1 text-sm">
          <RollDice roll={roll} />
        </div>
        {crit && <p className="mt-1 text-sm text-primary">20 naturale!</p>}
        {fumble && <p className="mt-1 text-sm text-destructive">1 naturale…</p>}
      </div>
      <span
        className={cn(
          "flex size-14 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-plum to-violet text-3xl text-primary-foreground tabular-nums",
          fumble && "from-muted-foreground to-muted-foreground"
        )}
      >
        {roll.total}
      </span>
    </div>
  )
}
