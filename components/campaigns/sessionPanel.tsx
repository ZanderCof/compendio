"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Check, Hourglass, LoaderCircle, Play, Swords } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FormState } from "@/features/campaigns/actions"
import { fetchSessionState, setReady, startSession } from "@/features/sessions/actions"
import type { SessionState } from "@/features/sessions/queries"

// Ogni quanto controllare se il master ha avviato (o i giocatori sono pronti)
const POLL_MS = 10_000

const timeFormat = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" })

/** Riquadro in cima al riepilogo: "Sono pronto" per i giocatori, "Avvia / Riprendi" per il master. */
export function SessionPanel({
  campaignId,
  isMaster,
  initial,
}: {
  campaignId: string
  isMaster: boolean
  initial: SessionState
}) {
  const [state, setState] = useState(initial)
  const [pending, startTransition] = useTransition()

  // Dopo un'azione la pagina si aggiorna e arriva un nuovo `initial`
  const [lastInitial, setLastInitial] = useState(initial)
  if (initial !== lastInitial) {
    setLastInitial(initial)
    setState(initial)
  }

  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      const next = await fetchSessionState(campaignId)
      if (next) setState(next)
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [campaignId])

  function run(action: () => Promise<FormState>) {
    startTransition(async () => {
      const result = await action()
      if (result?.error) toast.error(result.error)
    })
  }

  const active = state.active
  const playHref = `/campaigns/${campaignId}/play`

  return (
    <section
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-xl border-2 p-4",
        active ? "border-aqua bg-aqua/10" : "border-primary/30 bg-secondary/40"
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          active ? "bg-aqua text-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {active ? <Swords className="size-5" /> : <Hourglass className="size-5" />}
      </span>

      <div className="min-w-0 flex-1">
        <h2 className="text-xl leading-tight tracking-wide">
          {active ? "Sessione in corso" : "Prossima sessione"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {active
            ? `Iniziata alle ${timeFormat.format(new Date(active.startedAt))}`
            : state.players === 0
              ? "Ancora nessun giocatore: invitali dal gruppo qui sotto"
              : `${state.ready} di ${state.players} ${state.players === 1 ? "giocatore pronto" : "giocatori pronti"}`}
        </p>
      </div>

      {isMaster ? (
        <Button size="lg" disabled={pending} onClick={() => run(() => startSession(campaignId))}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Play />}
          {active ? "Riprendi sessione" : "Avvia sessione"}
        </Button>
      ) : active ? (
        <Button size="lg" asChild>
          <Link href={playHref}>
            <Swords />
            Entra nella sessione
          </Link>
        </Button>
      ) : (
        <Button
          size="lg"
          variant={state.viewerReady ? "secondary" : "default"}
          disabled={pending}
          aria-pressed={state.viewerReady}
          onClick={() => run(() => setReady(campaignId, !state.viewerReady))}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          {state.viewerReady ? "Pronto · annulla" : "Sono pronto"}
        </Button>
      )}
    </section>
  )
}
