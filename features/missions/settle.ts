import "server-only"

import { characterSheetSchema } from "@/features/characters/schema"
import type { Ability } from "@/features/characters/types"
import { cryptoRng, type Rng } from "@/features/dice/dice"
import { prisma } from "@/lib/prisma"
import { applyMissionReward, missionModifier, resolveOutcome } from "./engine"

/**
 * Chiude le missioni dell'utente già finite: il server tira la prova (d20 + modificatore contro la CD),
 * assegna l'EXP al profilo e, se riuscita, oggetto e oro al personaggio.
 * È idempotente: ogni ritorno si chiude una volta sola anche con due richieste insieme.
 */
export async function settleDueRuns(userId: string, now = new Date(), rng: Rng = cryptoRng) {
  const due = await prisma.missionRun.findMany({
    where: { userId, status: "ACTIVE", returnsAt: { lte: now } },
    select: {
      id: true,
      characterId: true,
      mission: { select: { xpReward: true, ability: true, dc: true, rewardItem: true, rewardGold: true } },
    },
  })

  for (const run of due) {
    await prisma.$transaction(async (tx) => {
      const character = await tx.character.findUnique({ where: { id: run.characterId }, select: { sheet: true } })
      const parsed = characterSheetSchema.safeParse(character?.sheet)
      if (!parsed.success) return
      const sheet = parsed.data

      // Il generatore restituisce già un numero da 1 a 20
      const natural = rng(20)
      const outcome = resolveOutcome(
        natural,
        missionModifier(sheet, run.mission.ability as Ability),
        run.mission.dc,
        run.mission.xpReward
      )

      // Solo chi trova la missione ancora in corso la chiude: l'altra richiesta non fa nulla
      const { count } = await tx.missionRun.updateMany({
        where: { id: run.id, status: "ACTIVE" },
        data: { status: "COMPLETED", completedAt: now, ...outcome },
      })
      if (count === 0) return

      await tx.user.update({ where: { id: userId }, data: { xp: { increment: outcome.xpAwarded } } })
      if (outcome.success) {
        await tx.character.update({
          where: { id: run.characterId },
          data: { sheet: applyMissionReward(sheet, run.mission) },
        })
      }
    })
  }
}
