import "dotenv/config"

import { afterAll, describe, expect, it } from "vitest"

import { consumeInvite } from "./admission"
import { generateInviteCode } from "./rules"

// Concorrenza sul Postgres vero (il DB di sviluppo in .env): crea codici temporanei,
// li consuma in parallelo e li cancella alla fine. Senza DATABASE_URL il test viene saltato.
const hasDb = Boolean(process.env.DATABASE_URL)
const { prisma } = hasDb ? await import("@/lib/prisma") : { prisma: null }
const created: string[] = []

async function tempInvite(maxUses: number) {
  const code = generateInviteCode()
  const invite = await prisma!.inviteCode.create({ data: { code, label: "test concorrenza (temporaneo)", maxUses } })
  created.push(invite.id)
  return invite
}

afterAll(async () => {
  if (!prisma) return
  await prisma.inviteCode.deleteMany({ where: { id: { in: created } } })
  await prisma.$disconnect()
})

describe.skipIf(!hasDb)("consumeInvite su Postgres", () => {
  it("due registrazioni insieme sull'ultimo uso: ne passa una sola", async () => {
    const invite = await tempInvite(1)
    const results = await Promise.all([consumeInvite(prisma!, invite.code), consumeInvite(prisma!, invite.code)])
    expect(results.filter(Boolean)).toEqual([invite.id])
    const after = await prisma!.inviteCode.findUniqueOrThrow({ where: { id: invite.id } })
    expect(after.uses).toBe(1)
  })

  it("dieci registrazioni insieme su 3 usi: ne passano esattamente 3", async () => {
    const invite = await tempInvite(3)
    const results = await Promise.all(Array.from({ length: 10 }, () => consumeInvite(prisma!, invite.code)))
    expect(results.filter(Boolean)).toHaveLength(3)
    const after = await prisma!.inviteCode.findUniqueOrThrow({ where: { id: invite.id } })
    expect(after.uses).toBe(3)
  })

  it("codice revocato: nessun uso consumato", async () => {
    const invite = await tempInvite(5)
    await prisma!.inviteCode.update({ where: { id: invite.id }, data: { revokedAt: new Date() } })
    expect(await consumeInvite(prisma!, invite.code)).toBeNull()
  })
}, 60_000)
