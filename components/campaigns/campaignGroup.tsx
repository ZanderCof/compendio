"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Check, Crown, LoaderCircle, Mail, RotateCcw, Send, X } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/initials"
import { fetchCampaignGroup, type FormState } from "@/features/campaigns/actions"
import type { GroupEntry, GroupStatus } from "@/features/campaigns/group"
import { cancelInvitation, inviteByEmail } from "@/features/campaigns/invitations"
import { RemoveMemberButton } from "./campaignActions"

// Ogni quanto aggiornare gli stati mentre la pagina è aperta
const POLL_MS = 20_000

const STATUS: Record<GroupStatus, { label: string; dot: string; pill: string }> = {
  online: { label: "Online", dot: "bg-aqua", pill: "bg-aqua/20 text-foreground" },
  offline: { label: "Offline", dot: "bg-muted-foreground/50", pill: "bg-muted text-muted-foreground" },
  pending: { label: "Invito in attesa", dot: "bg-periwinkle", pill: "bg-periwinkle/20 text-foreground" },
  declined: { label: "Ha rifiutato", dot: "bg-destructive", pill: "bg-destructive/10 text-destructive" },
}

const relative = new Intl.RelativeTimeFormat("it", { numeric: "auto" })

/** "visto 5 minuti fa", "visto ieri"... */
function seenAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return `visto ${relative.format(Math.round(seconds / size), unit)}`
  }
  return "visto poco fa"
}

function StatusPill({ entry }: { entry: GroupEntry }) {
  const status = STATUS[entry.status]
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs", status.pill)}>
      <span className={cn("size-2 rounded-full", status.dot, entry.status === "online" && "animate-pulse")} />
      {status.label}
      {entry.status === "offline" && entry.lastSeenAt && (
        // Il tempo relativo cambia tra server e browser: la differenza è voluta
        <span suppressHydrationWarning>· {seenAgo(entry.lastSeenAt)}</span>
      )}
    </span>
  )
}

/** "Brakka, Vex (Alessandro)": personaggi come link alla scheda (se apribile), giocatore tra parentesi. */
function EntryName({ entry }: { entry: GroupEntry }) {
  if (entry.characters.length === 0) {
    return (
      <span className="truncate">
        {entry.playerName}
        {entry.role === "PLAYER" && <span className="text-muted-foreground"> · nessun personaggio</span>}
      </span>
    )
  }
  return (
    <span className="truncate">
      {entry.characters.map((character, i) => (
        <span key={character.id}>
          {i > 0 && ", "}
          {character.href ? (
            <Link href={character.href} className="text-primary underline-offset-2 hover:underline">
              {character.name}
            </Link>
          ) : (
            character.name
          )}
        </span>
      ))}{" "}
      <span className="text-muted-foreground">({entry.playerName})</span>
    </span>
  )
}

function InvitationActions({ campaignId, entry }: { campaignId: string; entry: GroupEntry }) {
  const [pending, startTransition] = useTransition()
  const run = (action: () => Promise<FormState>) =>
    startTransition(async () => {
      const result = await action()
      if (result?.error) toast.error(result.error)
    })

  return (
    <div className="flex gap-1">
      {entry.status === "declined" && (
        <Button variant="ghost" size="xs" disabled={pending} onClick={() => run(() => inviteByEmail(campaignId, entry.email!))}>
          <RotateCcw />
          Reinvita
        </Button>
      )}
      <Button
        variant="ghost"
        size="xs"
        className="text-muted-foreground"
        disabled={pending}
        aria-label={`Ritira l'invito a ${entry.playerName}`}
        onClick={() => run(() => cancelInvitation(entry.invitationId!))}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <X />}
        Ritira
      </Button>
    </div>
  )
}

function InviteByEmailForm({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => inviteByEmail(campaignId, String(formData.get("email") ?? "")),
    undefined
  )

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Input
          name="email"
          type="email"
          required
          placeholder="email Google dell'amico"
          aria-label="Email da invitare"
          className="min-w-48 flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
          Invita
        </Button>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}

export function CampaignGroup({
  campaignId,
  initial,
  isMaster,
  viewerId,
}: {
  campaignId: string
  initial: GroupEntry[]
  isMaster: boolean
  viewerId: string
}) {
  const [entries, setEntries] = useState(initial)

  // Dopo un'azione (invito, rimozione...) la pagina si aggiorna e arriva un nuovo `initial`
  const [lastInitial, setLastInitial] = useState(initial)
  if (initial !== lastInitial) {
    setLastInitial(initial)
    setEntries(initial)
  }

  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      setEntries(await fetchCampaignGroup(campaignId))
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [campaignId])

  const online = entries.filter((e) => e.status === "online").length
  const members = entries.filter((e) => e.role !== null).length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {members} {members === 1 ? "membro" : "membri"} · {online} online
      </p>

      <ul className="flex flex-col divide-y rounded-lg border bg-card">
        {entries.map((entry) => (
          <li key={entry.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
            <Avatar className={cn("size-8", entry.role === null && "opacity-60")}>
              {entry.image && <AvatarImage src={entry.image} alt="" />}
              <AvatarFallback>{entry.role === null ? <Mail className="size-4" /> : initials(entry.playerName)}</AvatarFallback>
            </Avatar>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <EntryName entry={entry} />
              {entry.role === "MASTER" && (
                <Badge className="shrink-0">
                  <Crown />
                  Master
                </Badge>
              )}
              {entry.userId === viewerId && <span className="shrink-0 text-xs text-muted-foreground">(tu)</span>}
              {entry.ready && (
                <Badge variant="secondary" className="shrink-0">
                  <Check />
                  Pronto
                </Badge>
              )}
            </div>

            <StatusPill entry={entry} />

            {isMaster && entry.role === "PLAYER" && (
              <RemoveMemberButton campaignId={campaignId} memberId={entry.userId!} memberName={entry.playerName} />
            )}
            {isMaster && entry.invitationId && <InvitationActions campaignId={campaignId} entry={entry} />}
          </li>
        ))}
      </ul>

      {isMaster && (
        <div>
          <p className="mb-2 text-xs tracking-widest text-muted-foreground">Invita per email</p>
          <InviteByEmailForm campaignId={campaignId} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            L&apos;amico vedrà l&apos;invito nella sua pagina Campagne dopo l&apos;accesso con Google.
          </p>
        </div>
      )}
    </div>
  )
}
