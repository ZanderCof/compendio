"use client"

import { useState, useSyncExternalStore, useTransition } from "react"
import { Check, LoaderCircle, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { startMission } from "@/features/missions/actions"
import { cn } from "@/lib/utils"

// Orologio al minuto condiviso: il valore cambia solo una volta al minuto
const subscribeMinute = (onChange: () => void) => {
  const timer = setInterval(onChange, 15_000)
  return () => clearInterval(timer)
}
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000

/** "Torna tra 3 h 20 min": si aggiorna da solo ogni minuto. */
export function ReturnsIn({ at }: { at: string }) {
  // Sul server (e al primo render) non si conosce l'ora del browser: niente conto alla rovescia
  const now = useSyncExternalStore(subscribeMinute, currentMinute, () => null)
  if (now === null) return <span>In viaggio</span>
  const minutes = Math.max(0, Math.ceil((new Date(at).getTime() - now) / 60_000))
  if (minutes === 0) return <span>Sta tornando…</span>
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  const parts = days > 0 ? [`${days} g`, hours > 0 && `${hours} h`] : hours > 0 ? [`${hours} h`, rest > 0 && `${rest} min`] : [`${rest} min`]
  return <span>Torna tra {parts.filter(Boolean).join(" ")}</span>
}

/** "Manda in missione": sceglie il personaggio tra quelli abilitati; chi non può partire mostra il motivo. */
export function SendOnMission({
  missionId,
  missionTitle,
  candidates,
}: {
  missionId: string
  missionTitle: string
  candidates: { id: string; name: string; problem: string | null }[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [sending, setSending] = useState<string | null>(null)
  const anyReady = candidates.some((c) => c.problem === null)

  function send(characterId: string, name: string) {
    setSending(characterId)
    startTransition(async () => {
      const result = await startMission(characterId, missionId)
      setSending(null)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${name} è partito per "${missionTitle}"`, { description: "Al ritorno vedrai com'è andata." })
      setOpen(false)
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" disabled={!anyReady} title={anyReady ? undefined : "Nessun tuo personaggio può partire per questa missione"}>
          <Send />
          Manda in missione
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">Chi parte?</p>
        <ul className="flex flex-col gap-1">
          {candidates.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={c.problem !== null || pending}
                onClick={() => send(c.id, c.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                  c.problem === null ? "hover:border-primary/50 hover:bg-primary/5" : "cursor-not-allowed opacity-60"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.problem ?? "Pronto a partire"}</span>
                </span>
                {sending === c.id ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  c.problem === null && <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
