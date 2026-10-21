import { z } from "zod"

// Ostacoli della mappa, salvati nel campo JSON GameMap.layout.
// Le celle sono indici riga per riga (vedi cellIndex), i bordi hanno i nomi di edgeKey.

const edgeKeySchema = z.string().regex(/^[vh]:\d+:\d+$/)

export const mapLayoutSchema = z.object({
  /** Celle non attraversabili: colonne, massi, acqua profonda */
  blocked: z.array(z.number().int().min(0)).default([]),
  /** Celle attraversabili che costano il doppio del movimento */
  difficult: z.array(z.number().int().min(0)).default([]),
  /** Muri sottili tra due celle */
  walls: z.array(edgeKeySchema).default([]),
  /** Porte sui bordi: true = aperta */
  doors: z.record(edgeKeySchema, z.boolean()).default({}),
})

export type MapLayout = z.infer<typeof mapLayoutSchema>

export const emptyLayout = (): MapLayout => ({ blocked: [], difficult: [], walls: [], doors: {} })

/** Legge il JSON dal database: se fosse rovinato si riparte da una mappa senza ostacoli. */
export function parseLayout(value: unknown): MapLayout {
  return mapLayoutSchema.safeParse(value).data ?? emptyLayout()
}
