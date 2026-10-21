"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { LoaderCircle, SendHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/initials"
import { fetchMessagesAfter, sendMessage } from "@/features/chat/actions"
import { MAX_MESSAGE_LENGTH } from "@/features/chat/limits"
import type { ChatMessageView } from "@/features/chat/queries"

// Ogni quanto chiedere i messaggi nuovi mentre la pagina è aperta
const POLL_MS = 4_000
// Messaggi dello stesso autore a meno di così si raggruppano sotto un solo nome
const GROUP_WINDOW_MS = 5 * 60_000

const timeFormat = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" })

/** Aggiunge i messaggi nuovi senza duplicati (il proprio può arrivare sia dall'invio sia dal controllo). */
function merge(current: ChatMessageView[], incoming: ChatMessageView[]) {
  const ids = new Set(current.map((m) => m.id))
  const fresh = incoming.filter((m) => !ids.has(m.id))
  if (fresh.length === 0) return current
  return [...current, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function CampaignChat({
  campaignId,
  viewerId,
  initial,
  fill = false,
}: {
  campaignId: string
  viewerId: string
  initial: ChatMessageView[]
  /** Riempie l'altezza del contenitore (pannello della sessione): il campo di scrittura resta in fondo */
  fill?: boolean
}) {
  const [messages, setMessages] = useState(initial)
  const [draft, setDraft] = useState("")
  const [sending, startTransition] = useTransition()
  const listRef = useRef<HTMLDivElement>(null)
  // Si scorre in fondo solo se l'utente era già in fondo: non lo si strappa da quello che sta rileggendo
  const stickToBottom = useRef(true)

  // Data dell'ultimo messaggio: il controllo chiede solo quelli successivi
  const lastAt = messages.at(-1)?.createdAt ?? new Date(0).toISOString()

  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      const incoming = await fetchMessagesAfter(campaignId, lastAt)
      if (incoming.length) setMessages((prev) => merge(prev, incoming))
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [campaignId, lastAt])

  useEffect(() => {
    const list = listRef.current
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight
  }, [messages])

  function send() {
    const body = draft.trim()
    if (!body || sending) return
    startTransition(async () => {
      const result = await sendMessage(campaignId, body)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      stickToBottom.current = true
      setDraft("")
      setMessages((prev) => merge(prev, [result.message]))
    })
  }

  return (
    <div className={cn("flex flex-col", fill ? "h-full min-h-0" : "h-[28rem]")}>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1"
        aria-live="polite"
        aria-label="Messaggi della chat"
      >
        {messages.length === 0 && (
          <p className="m-auto text-center text-sm text-muted-foreground">
            Nessun messaggio. Scrivi qualcosa al gruppo!
          </p>
        )}
        {messages.map((message, i) => {
          const mine = message.user.id === viewerId
          const previous = messages[i - 1]
          // Stesso autore da poco: niente nome e avatar ripetuti
          const grouped =
            previous?.user.id === message.user.id &&
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_WINDOW_MS

          return (
            <div key={message.id} className={cn("flex gap-2", mine && "flex-row-reverse", !grouped && "mt-2")}>
              {grouped ? (
                <span className="w-7 shrink-0" />
              ) : (
                <Avatar className="size-7 shrink-0">
                  {message.user.image && <AvatarImage src={message.user.image} alt="" />}
                  <AvatarFallback className="text-xs">{initials(message.user.name)}</AvatarFallback>
                </Avatar>
              )}
              <div className={cn("flex max-w-[80%] flex-col", mine && "items-end")}>
                {!grouped && (
                  <span className="mb-0.5 text-xs text-muted-foreground">
                    {mine ? "Tu" : message.user.name} · {timeFormat.format(new Date(message.createdAt))}
                  </span>
                )}
                <p
                  className={cn(
                    "rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap",
                    mine ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-secondary text-secondary-foreground",
                    grouped && "rounded-2xl"
                  )}
                >
                  {message.body}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <form
        className="mt-3 flex items-end gap-2 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Invio manda, Shift+Invio va a capo
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Scrivi al gruppo…"
          aria-label="Messaggio"
          className="max-h-32 min-h-9 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none [field-sizing:content] focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" size="icon-lg" disabled={sending || !draft.trim()} aria-label="Invia">
          {sending ? <LoaderCircle className="animate-spin" /> : <SendHorizontal />}
        </Button>
      </form>
    </div>
  )
}
