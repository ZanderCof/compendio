import { beforeEach, describe, expect, it, vi } from "vitest"

// Il test chiama la route direttamente, come farebbe chi salta i controlli del browser.
// Sessione, database e disco sono finti: si verifica solo la logica della route.
const session = vi.hoisted(() => ({ current: { user: { id: "master" } } as { user: { id: string } } | null }))
const role = vi.hoisted(() => ({ isMaster: true }))
const written = vi.hoisted(() => [] as string[])

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => session.current } } }))
vi.mock("@/lib/prisma", () => ({
  prisma: { membership: { findFirst: async () => (role.isMaster ? { id: "m" } : null) } },
}))
vi.mock("node:fs/promises", () => ({
  mkdir: async () => undefined,
  writeFile: async (file: string) => {
    written.push(file)
  },
}))

const { POST } = await import("./route")

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function request(bytes: Uint8Array<ArrayBuffer> | string, name = "mappa.png", type = "image/png") {
  const form = new FormData()
  form.set("campaignId", "c1")
  form.set("file", new File([bytes], name, { type }))
  return new Request("http://localhost/api/maps/upload", { method: "POST", body: form })
}

describe("POST /api/maps/upload (sviluppo, senza Blob)", () => {
  beforeEach(() => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "")
    vi.stubEnv("NODE_ENV", "development")
    session.current = { user: { id: "master" } }
    role.isMaster = true
    written.length = 0
  })

  it("rifiuta un falso PNG anche se nome e tipo dichiarato dicono png", async () => {
    const response = await POST(request("<svg xmlns='http://www.w3.org/2000/svg'/>"))
    expect(response.status).toBe(415)
    expect(await response.json()).toEqual({ error: "Sono accettate solo immagini jpg, png o webp" })
    expect(written).toHaveLength(0)
  })

  it("accetta un vero PNG e lo salva con un nome casuale", async () => {
    const response = await POST(request(new Uint8Array([...PNG, 0, 0, 0, 0])))
    expect(response.status).toBe(200)
    const { url } = (await response.json()) as { url: string }
    expect(url).toMatch(/^\/uploads\/maps\/[\w-]+\.png$/)
    expect(written).toHaveLength(1)
  })

  it("rifiuta i file oltre 10 MB", async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1)
    big.set(PNG)
    const response = await POST(request(big))
    expect(response.status).toBe(413)
    expect(written).toHaveLength(0)
  })

  it("rifiuta chi non è il master", async () => {
    role.isMaster = false
    const response = await POST(request(new Uint8Array(PNG)))
    expect(response.status).toBe(403)
  })

  it("rifiuta chi non ha fatto l'accesso", async () => {
    session.current = null
    const response = await POST(request(new Uint8Array(PNG)))
    expect(response.status).toBe(403)
  })

  it("in produzione senza token il caricamento è spento", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const response = await POST(request(new Uint8Array(PNG)))
    expect(response.status).toBe(503)
  })
})
