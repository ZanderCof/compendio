// Crea un codice d'invito alla beta dal terminale:
//   npm run invite:create -- --label "Gruppo del giovedì" --uses 5 [--days 7]
import "dotenv/config"
import { parseArgs } from "node:util"

import { generateInviteCode } from "@/features/invites/rules"
import { prisma } from "@/lib/prisma"

async function main() {
  const { values } = parseArgs({
    options: {
      label: { type: "string" },
      uses: { type: "string", default: "1" },
      days: { type: "string" },
    },
  })

  const label = values.label?.trim()
  const maxUses = Number(values.uses)
  const days = values.days === undefined ? null : Number(values.days)
  if (!label) throw new Error('Manca --label, es. --label "Davide"')
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 500) throw new Error("--uses deve essere tra 1 e 500")
  if (days !== null && (!Number.isFinite(days) || days <= 0)) throw new Error("--days deve essere un numero positivo")

  const code = generateInviteCode()
  await prisma.inviteCode.create({
    data: {
      code,
      label: label.slice(0, 80),
      maxUses,
      expiresAt: days === null ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  })

  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
  console.log(`Invito "${label}" creato (${maxUses} ${maxUses === 1 ? "uso" : "usi"}${days ? `, scade tra ${days} giorni` : ""}):`)
  console.log(`${base}/invite/${code}`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
