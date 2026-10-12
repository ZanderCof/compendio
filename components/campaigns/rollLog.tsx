"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { fetchCampaignRolls } from "@/features/rolls/actions"
import type { RollLogEntry } from "@/features/rolls/queries"

// Ogni quanto aggiornare il registro mentre la pagina è aperta
const POLL_MS = 5_000

const timeFormat = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" })

/** Ultimi tiri del gruppo, aggiornati da soli. */
export function RollLog({ campaignId, initial }: { campaignId: string; initial: RollLogEntry[] }) {
  const [rolls, setRolls] = useState(initial)

  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      setRolls(await fetchCampaignRolls(campaignId))
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [campaignId])

  if (rolls.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ancora nessun tiro. I tiri fatti dalle schede dei personaggi in campagna compaiono qui.
      </p>
    )
  }

  return (
    <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1" aria-live="polite">
      {rolls.map((roll) => {
        const crit = roll.natural === 20
        const fumble = roll.natural === 1
        return (
          <li
            key={roll.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-card p-2",
              crit && "border-aqua bg-aqua/10",
              fumble && "border-destructive/50 bg-destructive/5"
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="text-primary">{roll.characterName ?? roll.userName}</span> · {roll.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roll.notation} · [{roll.rolls.join(", ")}] · {timeFormat.format(new Date(roll.createdAt))}
                {crit && " · 20 naturale!"}
                {fumble && " · 1 naturale"}
              </p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg tabular-nums">
              {roll.total}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
