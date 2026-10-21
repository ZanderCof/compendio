"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { abilitySchema } from "@/features/characters/schema"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { romeMidnight } from "./engine"
import { DIAMOND_GAP_DAYS, MISSION_TIERS, diamondTooClose, resolveTierValues } from "./tiers"

export type MissionFormState = { error?: string; created?: boolean } | undefined

// Campo numerico facoltativo: vuoto = valore predefinito del livello
const optionalInt = (min: number, max: number, message: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(min, message).max(max, message).optional()
  )

const missionSchema = z
  .object({
    tier: z.enum(MISSION_TIERS, "Scegli il livello della missione"),
    title: z.string().trim().min(1, "Dai un titolo alla missione").max(80, "Titolo troppo lungo"),
    description: z.string().trim().min(1, "Scrivi una descrizione").max(1000, "Descrizione troppo lunga"),
    xpReward: optionalInt(0, 10_000, "EXP tra 0 e 10.000"),
    rewardItem: z
      .string()
      .trim()
      .max(80, "Nome dell'oggetto troppo lungo")
      .transform((v) => v || null),
    rewardGold: z.coerce.number().int().min(0).max(100_000),
    minLevel: optionalInt(1, 20, "Livello minimo tra 1 e 20"),
    allowedClasses: z.array(z.string().trim().min(1).max(60)).max(30),
    allowedRaces: z.array(z.string().trim().min(1).max(60)).max(30),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data di inizio non valida"),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data di fine non valida"),
    durationHours: optionalInt(1, 24 * 14, "Durata tra 1 ora e due settimane"),
    ability: abilitySchema,
    dc: optionalInt(1, 40, "CD tra 1 e 40"),
  })
  .refine((m) => m.endsOn >= m.startsOn, { message: "La fine deve venire dopo l'inizio", path: ["endsOn"] })

/** Nuova missione. Solo admin (controllo lato server). */
export async function createMission(_prev: MissionFormState, formData: FormData): Promise<MissionFormState> {
  const admin = await requireAdmin()
  const parsed = missionSchema.safeParse({
    tier: formData.get("tier") ?? "",
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    xpReward: formData.get("xpReward"),
    rewardItem: formData.get("rewardItem") ?? "",
    rewardGold: formData.get("rewardGold") || 0,
    minLevel: formData.get("minLevel"),
    allowedClasses: formData.getAll("allowedClasses").map(String),
    allowedRaces: formData.getAll("allowedRaces").map(String),
    startsOn: formData.get("startsOn") ?? "",
    endsOn: formData.get("endsOn") ?? "",
    durationHours: formData.get("durationHours"),
    ability: formData.get("ability") ?? "",
    dc: formData.get("dc"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" }

  // Date dai campi <input type="date">: apre a mezzanotte (ora italiana) del primo giorno, chiude dopo l'ultimo
  const { startsOn, endsOn, tier, xpReward, dc, durationHours, minLevel, ...mission } = parsed.data
  const startsAt = romeMidnight(startsOn)

  // Il diamante è rarissimo: niente due diamanti a meno di un mese l'uno dall'altro
  if (tier === "DIAMOND") {
    const diamonds = await prisma.mission.findMany({ where: { tier: "DIAMOND" }, select: { startsAt: true } })
    const clash = diamondTooClose(startsAt, diamonds.map((d) => d.startsAt))
    if (clash) {
      const day = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "Europe/Rome" }).format(clash)
      return {
        error: `C'è già una missione diamante che parte il ${day}: tra due diamanti devono passare almeno ${DIAMOND_GAP_DAYS} giorni`,
      }
    }
  }

  await prisma.mission.create({
    data: {
      ...mission,
      // Valori scritti dall'admin, altrimenti quelli del livello
      ...resolveTierValues(tier, { xpReward, dc, durationHours, minLevel }),
      tier,
      startsAt,
      // Fino alla fine dell'ultimo giorno compreso
      endsAt: romeMidnight(endsOn, 1),
      createdById: admin.id,
    },
  })
  refresh()
  return { created: true }
}

/** Chiude una missione in anticipo: nessuno può più partire, chi è già via torna normalmente. */
export async function closeMission(id: string): Promise<MissionFormState> {
  await requireAdmin()
  const { count } = await prisma.mission.updateMany({ where: { id, closedAt: null }, data: { closedAt: new Date() } })
  if (count === 0) return { error: "Missione non trovata o già chiusa" }
  refresh()
}

/** Elimina una missione che nessuno ha ancora fatto (altrimenti si chiude e resta nello storico). */
export async function deleteMission(id: string): Promise<MissionFormState> {
  await requireAdmin()
  const runs = await prisma.missionRun.count({ where: { missionId: id } })
  if (runs > 0) return { error: "Qualcuno l'ha già fatta: chiudila invece di eliminarla" }
  const { count } = await prisma.mission.deleteMany({ where: { id } })
  if (count === 0) return { error: "Missione non trovata" }
  refresh()
}
