import { describe, expect, it } from "vitest"

import { canDeleteEntry, canEditEntry, canReadScope, canWriteScope, journalEntrySchema } from "./journal"

const master = { userId: "m", isMaster: true }
const player = { userId: "p", isMaster: false }
const otherPlayer = { userId: "q", isMaster: false }

describe("permessi del diario", () => {
  it("il diario del gruppo è aperto a tutti, quello del master solo a lui", () => {
    expect(canReadScope("SHARED", player)).toBe(true)
    expect(canReadScope("MASTER", player)).toBe(false)
    expect(canReadScope("MASTER", master)).toBe(true)
    expect(canWriteScope("MASTER", player)).toBe(false)
  })

  it("una voce la modifica solo chi l'ha scritta", () => {
    const entry = { scope: "SHARED" as const, authorId: "p" }
    expect(canEditEntry(entry, player)).toBe(true)
    expect(canEditEntry(entry, otherPlayer)).toBe(false)
    expect(canEditEntry(entry, master)).toBe(false)
  })

  it("il master può cancellare le voci del gruppo, non gli altri giocatori", () => {
    const entry = { scope: "SHARED" as const, authorId: "p" }
    expect(canDeleteEntry(entry, master)).toBe(true)
    expect(canDeleteEntry(entry, otherPlayer)).toBe(false)
  })

  it("chi non è più master non tocca le note private che aveva scritto", () => {
    const entry = { scope: "MASTER" as const, authorId: "p" }
    expect(canEditEntry(entry, player)).toBe(false)
    expect(canDeleteEntry(entry, player)).toBe(false)
  })
})

describe("journalEntrySchema", () => {
  it("richiede un titolo", () => {
    expect(journalEntrySchema.safeParse({ kind: "NPC", title: "  " }).success).toBe(false)
  })

  it("il testo è facoltativo", () => {
    expect(journalEntrySchema.parse({ kind: "PLACE", title: "Belcastello" }).body).toBe("")
  })
})
