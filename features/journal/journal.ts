import { z } from "zod"

// Tipi e regole del diario: usati sia dal server sia dalla pagina.

export const JOURNAL_KINDS = [
  { value: "SESSION", label: "Sessione" },
  { value: "NPC", label: "PNG" },
  { value: "PLACE", label: "Luogo" },
  { value: "NOTE", label: "Nota" },
] as const

export type JournalKind = (typeof JOURNAL_KINDS)[number]["value"]
export type JournalScope = "SHARED" | "MASTER"

export const journalEntrySchema = z.object({
  kind: z.enum(["SESSION", "NPC", "PLACE", "NOTE"]),
  title: z.string().trim().min(1, "Dai un titolo alla voce").max(120),
  body: z.string().trim().max(10_000).default(""),
})

export type JournalEntryInput = z.input<typeof journalEntrySchema>

type Viewer = { userId: string; isMaster: boolean }
type Entry = { scope: JournalScope; authorId: string }

/** Il diario personale del master lo vede solo il master. */
export const canReadScope = (scope: JournalScope, viewer: Viewer) => scope === "SHARED" || viewer.isMaster

/** Scrivere: nel diario del gruppo tutti i membri, in quello del master solo lui. */
export const canWriteScope = canReadScope

/** Modificare: solo chi l'ha scritta (e, nel diario del master, solo se è ancora master). */
export const canEditEntry = (entry: Entry, viewer: Viewer) =>
  entry.authorId === viewer.userId && canReadScope(entry.scope, viewer)

/** Cancellare: chi l'ha scritta, oppure il master nel diario del gruppo. */
export const canDeleteEntry = (entry: Entry, viewer: Viewer) =>
  canEditEntry(entry, viewer) || (entry.scope === "SHARED" && viewer.isMaster)
