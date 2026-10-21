import "server-only"

import { prisma } from "@/lib/prisma"
import { xpProgress } from "./xp"

/** EXP e livello del profilo. */
export async function getProfileXp(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } })
  return xpProgress(user?.xp ?? 0)
}
