import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MAP_IMAGE_MAX_BYTES, MAP_IMAGE_TYPES, sniffImageType, uploadMode } from "@/features/maps/upload"

const payloadSchema = z.object({ campaignId: z.string().min(1) })

/** Solo il master della campagna può caricare mappe. */
async function isMaster(request: Request, campaignId: string) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return false
  const membership = await prisma.membership.findFirst({
    where: { campaignId, userId: session.user.id, role: "MASTER" },
  })
  return !!membership
}

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const

export async function POST(request: Request) {
  const mode = uploadMode()
  if (!mode) return NextResponse.json({ error: "Caricamento immagini non configurato" }, { status: 503 })

  // Vercel Blob: il browser carica direttamente, qui si rilascia solo il permesso
  if (mode === "blob") {
    const body = (await request.json()) as HandleUploadBody
    try {
      const result = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (_pathname, clientPayload) => {
          const payload = payloadSchema.safeParse(JSON.parse(clientPayload ?? "{}"))
          if (!payload.success || !(await isMaster(request, payload.data.campaignId))) {
            throw new Error("Solo il master può caricare mappe")
          }
          return {
            allowedContentTypes: [...MAP_IMAGE_TYPES],
            maximumSizeInBytes: MAP_IMAGE_MAX_BYTES,
            addRandomSuffix: true,
          }
        },
      })
      return NextResponse.json(result)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Caricamento rifiutato" }, { status: 400 })
    }
  }

  // Sviluppo senza token: il file arriva qui e finisce in public/uploads (ignorata da git)
  const form = await request.formData()
  const file = form.get("file")
  const payload = payloadSchema.safeParse({ campaignId: form.get("campaignId") })
  if (!payload.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 })
  }
  if (!(await isMaster(request, payload.data.campaignId))) {
    return NextResponse.json({ error: "Solo il master può caricare mappe" }, { status: 403 })
  }
  if (file.size > MAP_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Immagine troppo grande (max 10 MB)" }, { status: 413 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const type = sniffImageType(bytes)
  if (!type) return NextResponse.json({ error: "Sono accettate solo immagini jpg, png o webp" }, { status: 415 })

  const name = `${randomUUID()}.${EXTENSIONS[type]}`
  const dir = path.join(process.cwd(), "public", "uploads", "maps")
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, name), bytes)
  return NextResponse.json({ url: `/uploads/maps/${name}` })
}
