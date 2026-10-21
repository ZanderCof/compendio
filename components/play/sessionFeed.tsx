"use client"

import { useEffect, useRef, useState } from "react"
import { EyeOff } from "lucide-react"
import { toast } from "sonner"

import { RollDice, RollToast } from "@/components/dice/rollToast"
import { cn } from "@/lib/utils"
import { fetchSessionFeed } from "@/features/rolls/actions"
import type { FeedRoll } from "@/features/rolls/queries"

// Ogni quanto chiedere i tiri nuovi: abbastanza spesso da sembrare in diretta
const POLL_MS = 1_500

const timeFormat = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })

const who = (roll: FeedRoll) => roll.characterName ?? roll.user.name

/** Tiri della sessione in diretta: quelli degli altri compaiono anche come popup. */
export function SessionFeed({
  campaignId,
  viewerId,
  initial,
}: {
  campaignId: string
  viewerId: string
  initial: FeedRoll[]
}) {
  const [rolls, setRolls] = useState(initial)
  const lastAt = rolls.at(-1)?.createdAt
  // I popup solo per i tiri arrivati dopo l'apertura della pagina
  const seen = useRef(new Set(initial.map((r) => r.id)))

  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      const incoming = await fetchSessionFeed(campaignId, lastAt)
      const fresh = incoming.filter((r) => !seen.current.has(r.id))
      if (fresh.length === 0) return
      for (const roll of fresh) {
        seen.current.add(roll.id)
        // I propri tiri hanno già il loro popup dal pannello dadi
        if (roll.user.id !== viewerId) {
          toast.custom(
            () => (
              <RollToast
                roll={{ ...roll, label: `${who(roll)} · ${roll.label}`, at: Date.parse(roll.createdAt) }}
              />
            ),
            { duration: 4000 }
          )
        }
      }
      setRolls((prev) => [...prev, ...fresh])
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [campaignId, lastAt, viewerId])

  if (rolls.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Ancora nessun tiro in questa sessione. Quando qualcuno tira, compare qui per tutti.
      </p>
    )
  }

  // Il più recente in alto
  return (
    <ul className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1" aria-live="polite">
      {[...rolls].reverse().map((roll) => {
        const crit = roll.natural === 20
        const fumble = roll.natural === 1
        return (
          <li
            key={roll.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-card p-2",
              crit && "border-aqua bg-aqua/10",
              fumble && "border-destructive/50 bg-destructive/5",
              roll.hidden && "border-dashed opacity-80"
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className={cn(roll.user.id === viewerId ? "text-violet" : "text-primary")}>{who(roll)}</span>
                {" · "}
                {roll.label}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <RollDice roll={{ ...roll, at: 0 }} />
                <span>· {timeFormat.format(new Date(roll.createdAt))}</span>
                {roll.hidden && (
                  <span className="flex items-center gap-1">
                    <EyeOff className="size-3" />
                    nascosto
                  </span>
                )}
                {crit && <span className="text-foreground">· 20 naturale!</span>}
                {fumble && <span className="text-destructive">· 1 naturale</span>}
              </div>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-xl tabular-nums">
              {roll.total}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
