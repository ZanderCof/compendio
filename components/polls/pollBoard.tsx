"use client"

import { useState, useTransition } from "react"
import { CalendarCheck, CalendarPlus, LoaderCircle, Plus, Star, X } from "lucide-react"
import { toast } from "sonner"

import { ConfirmButton } from "@/components/shared/confirmButton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/initials"
import type { FormState } from "@/features/campaigns/actions"
import { cancelPoll, chooseDate, createPoll, vote } from "@/features/polls/actions"
import { bestOptions, MAX_OPTIONS, formatPollDate, tally, type Answer } from "@/features/polls/polls"
import type { PollView } from "@/features/polls/queries"

const ANSWERS: { value: Answer; label: string; on: string }[] = [
  { value: "YES", label: "Sì", on: "border-aqua bg-aqua/30" },
  { value: "MAYBE", label: "Forse", on: "border-periwinkle bg-periwinkle/30" },
  { value: "NO", label: "No", on: "border-destructive/60 bg-destructive/15" },
]

const DOT: Record<Answer, string> = { YES: "ring-aqua", MAYBE: "ring-periwinkle", NO: "ring-destructive opacity-50" }

function useAction() {
  const [pending, startTransition] = useTransition()
  const run = (action: () => Promise<FormState>) =>
    startTransition(async () => {
      const result = await action()
      if (result?.error) toast.error(result.error)
    })
  return [pending, run] as const
}

/** Modulo del master: da 1 a 6 date con orario. */
export function ProposeDatesForm({ campaignId, onDone }: { campaignId: string; onDone?: () => void }) {
  const [dates, setDates] = useState<string[]>([""])
  const [pending, run] = useAction()

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        // datetime-local è nell'ora del browser: si converte in un istante preciso prima di mandarlo
        const iso = dates.filter(Boolean).map((d) => new Date(d).toISOString())
        run(async () => {
          const result = await createPoll(campaignId, iso)
          if (!result?.error) onDone?.()
          return result
        })
      }}
    >
      {dates.map((value, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="datetime-local"
            value={value}
            required
            onChange={(e) => setDates((prev) => prev.map((d, j) => (j === i ? e.target.value : d)))}
            aria-label={`Data ${i + 1}`}
            className="h-9 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {dates.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Togli la data ${i + 1}`}
              onClick={() => setDates((prev) => prev.filter((_, j) => j !== i))}
            >
              <X />
            </Button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={dates.length >= MAX_OPTIONS}
          onClick={() => setDates((prev) => [...prev, ""])}
        >
          <Plus />
          Aggiungi una data
        </Button>
        <Button type="submit" disabled={pending || dates.every((d) => !d)}>
          {pending ? <LoaderCircle className="animate-spin" /> : <CalendarPlus />}
          Chiedi al gruppo
        </Button>
      </div>
    </form>
  )
}

export function PollBoard({
  campaignId,
  poll,
  viewerId,
  isMaster,
}: {
  campaignId: string
  poll: PollView
  viewerId: string
  isMaster: boolean
}) {
  const [pending, run] = useAction()
  const [redoing, setRedoing] = useState(false)

  const tallies = poll.options.map((o) => tally(poll.voters.map((v) => o.answers[v.id])))
  const best = new Set(bestOptions(tallies))
  const missingVotes = poll.options.filter((o) => !o.answers[viewerId]).length

  return (
    <div className="flex flex-col gap-4">
      {missingVotes > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
          <span className="size-2 rounded-full bg-primary" />
          Rispondi per {missingVotes === 1 ? "1 data" : `${missingVotes} date`}: basta un tocco su Sì, Forse o No.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {poll.options.map((option, i) => {
          const mine = option.answers[viewerId]
          const t = tallies[i]
          return (
            <li
              key={option.id}
              className={cn("rounded-xl border bg-card p-4", best.has(i) && "border-aqua ring-1 ring-aqua/40")}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-lg leading-tight tracking-wide">
                    {best.has(i) && <Star className="size-4 shrink-0 fill-aqua text-aqua" aria-label="Data migliore" />}
                    {formatPollDate(new Date(option.startsAt))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.yes} sì · {t.maybe} forse · {t.no} no
                    {t.missing > 0 && ` · ${t.missing} senza risposta`}
                  </p>
                </div>

                <div className="flex gap-1" role="radiogroup" aria-label="La tua disponibilità">
                  {ANSWERS.map((answer) => (
                    <button
                      key={answer.value}
                      type="button"
                      role="radio"
                      aria-checked={mine === answer.value}
                      disabled={pending}
                      onClick={() => run(() => vote(option.id, answer.value))}
                      className={cn(
                        "h-8 rounded-lg border px-3 text-sm transition-colors",
                        mine === answer.value ? answer.on : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {answer.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {poll.voters.map((voter) => {
                  const answer = option.answers[voter.id]
                  return (
                    <Avatar
                      key={voter.id}
                      className={cn("size-7 ring-2", answer ? DOT[answer] : "opacity-30 ring-transparent")}
                      title={`${voter.name}: ${answer ? ANSWERS.find((a) => a.value === answer)!.label : "non ha risposto"}`}
                    >
                      {voter.image && <AvatarImage src={voter.image} alt="" />}
                      <AvatarFallback className="text-[0.6rem]">{initials(voter.name)}</AvatarFallback>
                    </Avatar>
                  )
                })}
                {isMaster && (
                  <Button
                    size="sm"
                    variant={best.has(i) ? "default" : "outline"}
                    className="ml-auto"
                    disabled={pending}
                    onClick={() => run(() => chooseDate(option.id))}
                  >
                    <CalendarCheck />
                    Scegli questa
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {isMaster && (
        <div className="flex flex-col gap-3 border-t pt-4">
          {redoing ? (
            <>
              <p className="text-sm text-muted-foreground">
                Le nuove date sostituiscono quelle di adesso, e le risposte date finora si perdono.
              </p>
              <ProposeDatesForm campaignId={campaignId} onDone={() => setRedoing(false)} />
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setRedoing(true)}>
                <CalendarPlus />
                Proponi altre date
              </Button>
              <ConfirmButton
                variant="ghost"
                size="sm"
                className="text-destructive"
                icon={<X />}
                label="Annulla il sondaggio"
                confirmLabel="Tocca di nuovo per annullare"
                action={() => cancelPoll(poll.id)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
