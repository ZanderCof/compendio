"use client"

import { useState, useTransition } from "react"
import { LoaderCircle, MapPin, NotebookPen, Pencil, Plus, ScrollText, StickyNote, Trash2, UserRound, X } from "lucide-react"
import { toast } from "sonner"

import { ConfirmButton } from "@/components/shared/confirmButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createJournalEntry, deleteJournalEntry, updateJournalEntry } from "@/features/journal/actions"
import { JOURNAL_KINDS, type JournalKind, type JournalScope } from "@/features/journal/journal"
import type { JournalEntryView } from "@/features/journal/queries"

const KIND_STYLE: Record<JournalKind, { icon: typeof ScrollText; className: string }> = {
  SESSION: { icon: ScrollText, className: "bg-plum/15 text-plum" },
  NPC: { icon: UserRound, className: "bg-violet/15 text-violet" },
  PLACE: { icon: MapPin, className: "bg-sky/20 text-foreground" },
  NOTE: { icon: StickyNote, className: "bg-periwinkle/20 text-foreground" },
}

const kindLabel = (kind: JournalKind) => JOURNAL_KINDS.find((k) => k.value === kind)!.label

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" })

function KindBadge({ kind }: { kind: JournalKind }) {
  const style = KIND_STYLE[kind]
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", style.className)}>
      <style.icon className="size-3.5" />
      {kindLabel(kind)}
    </span>
  )
}

type Draft = { kind: JournalKind; title: string; body: string }

/** Modulo per scrivere o modificare una voce. */
function EntryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  submitLabel: string
  onSubmit: (draft: Draft) => Promise<{ error?: string } | undefined>
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const result = await onSubmit(draft)
          if (result?.error) toast.error(result.error)
          else if (!onCancel) setDraft({ ...initial, kind: draft.kind })
        })
      }}
    >
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo di voce">
        {JOURNAL_KINDS.map((kind) => (
          <button
            key={kind.value}
            type="button"
            role="radio"
            aria-checked={draft.kind === kind.value}
            onClick={() => setDraft((d) => ({ ...d, kind: kind.value }))}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              draft.kind === kind.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {kind.label}
          </button>
        ))}
      </div>
      <Input
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        placeholder={draft.kind === "SESSION" ? "es. Sessione 4: la cripta di Belcastello" : "Titolo"}
        aria-label="Titolo"
        maxLength={120}
        required
      />
      <textarea
        value={draft.body}
        onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
        placeholder="Cosa è successo, chi è, cosa si sa…"
        aria-label="Testo"
        rows={5}
        maxLength={10_000}
        className="rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Annulla
          </Button>
        )}
        <Button type="submit" disabled={pending || !draft.title.trim()}>
          {pending && <LoaderCircle className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function EntryCard({ entry }: { entry: JournalEntryView }) {
  const [editing, setEditing] = useState(false)
  const edited = entry.updatedAt.slice(0, 16) !== entry.createdAt.slice(0, 16)

  return (
    <article className="rounded-xl border bg-card p-4">
      {editing ? (
        <EntryForm
          initial={{ kind: entry.kind, title: entry.title, body: entry.body }}
          submitLabel="Salva"
          onCancel={() => setEditing(false)}
          onSubmit={async (draft) => {
            const result = await updateJournalEntry(entry.id, draft)
            if (!result?.error) setEditing(false)
            return result
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <KindBadge kind={entry.kind} />
              <h3 className="mt-1 text-xl leading-tight tracking-wide">{entry.title}</h3>
              <p className="text-xs text-muted-foreground">
                {entry.author.name} · {dateFormat.format(new Date(entry.createdAt))}
                {edited && " · modificata"}
              </p>
            </div>
            <div className="flex gap-1">
              {entry.canEdit && (
                <Button variant="ghost" size="icon-sm" aria-label="Modifica voce" onClick={() => setEditing(true)}>
                  <Pencil />
                </Button>
              )}
              {entry.canDelete && (
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  icon={<Trash2 />}
                  label=""
                  confirmLabel="Cancella?"
                  aria-label="Cancella voce"
                  action={() => deleteJournalEntry(entry.id)}
                />
              )}
            </div>
          </div>
          {entry.body && <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>}
        </>
      )}
    </article>
  )
}

export function JournalView({
  campaignId,
  scope,
  entries,
}: {
  campaignId: string
  scope: JournalScope
  entries: JournalEntryView[]
}) {
  const [filter, setFilter] = useState<JournalKind | "ALL">("ALL")
  const [writing, setWriting] = useState(false)
  const visible = filter === "ALL" ? entries : entries.filter((e) => e.kind === filter)

  const counts = Object.fromEntries(JOURNAL_KINDS.map((k) => [k.value, entries.filter((e) => e.kind === k.value).length]))

  return (
    <div className="flex flex-col gap-4">
      {writing ? (
        <section className="rounded-xl border-2 border-primary/40 bg-secondary/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 tracking-wide">
              <NotebookPen className="size-4 text-primary" />
              Nuova voce
            </h2>
            <Button variant="ghost" size="icon-sm" aria-label="Chiudi" onClick={() => setWriting(false)}>
              <X />
            </Button>
          </div>
          <EntryForm
            initial={{ kind: filter === "ALL" ? "SESSION" : filter, title: "", body: "" }}
            submitLabel="Aggiungi al diario"
            onSubmit={async (draft) => {
              const result = await createJournalEntry(campaignId, scope, draft)
              if (!result?.error) setWriting(false)
              return result
            }}
          />
        </section>
      ) : (
        <Button onClick={() => setWriting(true)} className="self-start">
          <Plus />
          Nuova voce
        </Button>
      )}

      <div className="flex flex-wrap gap-1.5" aria-label="Filtra per tipo">
        {[{ value: "ALL" as const, label: "Tutto" }, ...JOURNAL_KINDS].map((kind) => (
          <button
            key={kind.value}
            type="button"
            aria-pressed={filter === kind.value}
            onClick={() => setFilter(kind.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              filter === kind.value ? "border-violet bg-violet/15" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {kind.label}
            <span className="ml-1 text-xs text-muted-foreground">
              {kind.value === "ALL" ? entries.length : counts[kind.value]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          {entries.length === 0
            ? scope === "MASTER"
              ? "Le tue note segrete: trame, PNG nascosti, idee per le prossime sessioni. Le vedi solo tu."
              : "Il diario è vuoto. Scrivete cosa è successo nell'ultima sessione, i PNG incontrati, i luoghi visitati."
            : "Nessuna voce di questo tipo."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
