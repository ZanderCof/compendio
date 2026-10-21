"use client"

import { useEffect, useState, useTransition } from "react"
import { ArrowRight, Check, Crown, LoaderCircle, Send, Undo2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  changeLabel,
  describeListChange,
  diffSheets,
  formatValue,
  type SheetChange,
} from "@/features/characters/diff"
import type { Character } from "@/features/characters/types"
import {
  cancelRequest,
  fetchPendingRequests,
  proposeChanges,
  respondToRequest,
} from "@/features/editRequests/actions"
import type { EditRequestView } from "@/features/editRequests/queries"
import { useCharacter } from "./characterProvider"

// Ogni quanto controllare se ci sono proposte nuove (o risposte, per il master)
const POLL_MS = 15_000

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

function ChangeRow({ change }: { change: SheetChange }) {
  const list = describeListChange(change)
  return (
    <li className="flex flex-col gap-0.5 border-b border-border/60 py-1.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="shrink-0 text-xs tracking-widest text-muted-foreground sm:w-44">
        {changeLabel(change.path)}
      </span>
      {list ? (
        <span className="text-sm">
          {list.added.length > 0 && <span className="text-primary">+ {list.added.join(", ")}</span>}
          {list.added.length > 0 && list.removed.length > 0 && " · "}
          {list.removed.length > 0 && (
            <span className="text-destructive line-through">{list.removed.join(", ")}</span>
          )}
        </span>
      ) : (
        <span className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground line-through">{formatValue(change.path, change.from)}</span>
          <ArrowRight className="size-3.5 text-violet" />
          <span>{formatValue(change.path, change.to)}</span>
        </span>
      )}
    </li>
  )
}

export function ChangeList({ changes }: { changes: SheetChange[] }) {
  return (
    <ul className="rounded-lg border bg-card px-3">
      {changes.map((change) => (
        <ChangeRow key={change.path} change={change} />
      ))}
    </ul>
  )
}

/** Tiene aggiornato l'elenco delle proposte mentre la pagina è aperta (solo se la scheda è visibile). */
function usePollRequests(characterId: string, setRequests: (r: EditRequestView[]) => void) {
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      setRequests(await fetchPendingRequests(characterId))
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [characterId, setRequests])
}

/** Banner del giocatore: una scheda per ogni proposta del master, con Accetta / Rifiuta. */
function PlayerRequests() {
  const { character, requests, setRequests, replaceFromServer, saveStatus } = useCharacter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  usePollRequests(character.id, setRequests)

  if (requests.length === 0) return null

  function respond(requestId: string, accept: boolean) {
    setPendingId(requestId)
    startTransition(async () => {
      const result = await respondToRequest(requestId, accept)
      setPendingId(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setRequests(result.requests)
      if (result.sheet) replaceFromServer(result.sheet)
      toast.success(accept ? "Modifiche applicate alla scheda" : "Proposta rifiutata")
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => (
        <section
          key={request.id}
          className="flex flex-col gap-3 rounded-xl border-2 border-primary/40 bg-secondary/50 p-4"
          aria-label="Proposta di modifica del master"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Crown className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg leading-tight tracking-wide">
                {request.requestedBy.name} propone {request.changes.length}{" "}
                {request.changes.length === 1 ? "modifica" : "modifiche"}
              </p>
              <p className="text-xs text-muted-foreground">{dateFormat.format(new Date(request.createdAt))}</p>
              {request.message && <p className="mt-1 text-sm italic">“{request.message}”</p>}
            </div>
          </div>

          <ChangeList changes={request.changes} />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => respond(request.id, false)}
              disabled={pendingId !== null}
            >
              {pendingId === request.id ? <LoaderCircle className="animate-spin" /> : <X />}
              Rifiuta
            </Button>
            <Button
              onClick={() => respond(request.id, true)}
              // Prima si finisce di salvare le proprie modifiche, poi si accetta
              disabled={pendingId !== null || saveStatus !== "saved"}
              title={saveStatus !== "saved" ? "Attendi il salvataggio della scheda" : undefined}
            >
              {pendingId === request.id ? <LoaderCircle className="animate-spin" /> : <Check />}
              Accetta
            </Button>
          </div>
        </section>
      ))}
    </div>
  )
}

/** Vista del master: le sue proposte ancora in attesa di risposta, con la possibilità di ritirarle. */
function MasterRequests() {
  const { character, requests, setRequests } = useCharacter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  usePollRequests(character.id, setRequests)

  if (requests.length === 0) return null

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-dashed border-primary/50 p-4">
      <h2 className="text-sm tracking-widest text-muted-foreground">
        In attesa di risposta dal giocatore
      </h2>
      {requests.map((request) => (
        <details key={request.id} className="rounded-lg border bg-card px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-2">
            <span className="flex-1 text-sm">
              {request.changes.length} {request.changes.length === 1 ? "modifica" : "modifiche"} ·{" "}
              {dateFormat.format(new Date(request.createdAt))}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pendingId !== null}
              onClick={(e) => {
                e.preventDefault()
                setPendingId(request.id)
                startTransition(async () => {
                  const result = await cancelRequest(request.id)
                  setPendingId(null)
                  if (result.ok) setRequests(result.requests)
                  else toast.error(result.error)
                })
              }}
            >
              {pendingId === request.id ? <LoaderCircle className="animate-spin" /> : <Undo2 />}
              Ritira
            </Button>
          </summary>
          <div className="mt-2">
            <ChangeList changes={request.changes} />
          </div>
        </details>
      ))}
    </section>
  )
}

export function EditRequestsPanel() {
  const { access } = useCharacter()
  return access === "owner" ? <PlayerRequests /> : <MasterRequests />
}

/** La scheda senza l'id: è la forma che si salva e si confronta. */
function sheetOnly(character: Character) {
  const sheet: Partial<Character> = { ...character }
  delete sheet.id
  return sheet
}

/** Barra del master mentre prepara una proposta: conta le modifiche, messaggio, invia o annulla. */
export function ProposalBar() {
  const { character, initial, endProposal, setRequests } = useCharacter()
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const changes = diffSheets(initial, character)

  function send() {
    startTransition(async () => {
      const result = await proposeChanges(character.id, sheetOnly(initial), sheetOnly(character), message)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setRequests(result.requests)
      setMessage("")
      endProposal()
      toast.success("Proposta inviata: il giocatore la vedrà sulla sua scheda")
    })
  }

  return (
    <section className="sticky top-[calc(var(--nav-h)+0.5rem)] z-20 flex flex-col gap-3 rounded-xl border-2 border-primary bg-card/95 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 tracking-wide">
          <Crown className="size-4 text-primary" />
          Stai preparando una proposta
        </p>
        <span className={cn("text-sm", changes.length ? "text-primary" : "text-muted-foreground")}>
          {changes.length === 0
            ? "Modifica la scheda qui sotto"
            : `${changes.length} ${changes.length === 1 ? "modifica" : "modifiche"}`}
        </span>
      </div>

      {changes.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">Vedi le modifiche</summary>
          <div className="mt-2 max-h-56 overflow-y-auto">
            <ChangeList changes={changes} />
          </div>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          placeholder="Messaggio per il giocatore (facoltativo)"
          aria-label="Messaggio per il giocatore"
          className="min-w-48 flex-1"
        />
        <Button variant="ghost" onClick={endProposal} disabled={pending}>
          Annulla
        </Button>
        <Button onClick={send} disabled={pending || changes.length === 0}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
          Invia proposta
        </Button>
      </div>
    </section>
  )
}
