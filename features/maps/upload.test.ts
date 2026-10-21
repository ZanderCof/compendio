import { describe, expect, it } from "vitest"

import { isAllowedImageUrl, sniffImageType } from "./upload"

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)])

describe("sniffImageType", () => {
  it("riconosce jpg, png e webp dai primi byte", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg")
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png")
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp")
  })

  it("rifiuta tutto il resto, anche se il nome finisce in .png", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns=..."))).toBeNull()
    expect(sniffImageType(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull() // GIF
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20))).toBeNull() // AVI
  })
})

describe("isAllowedImageUrl", () => {
  it("accetta il Blob store e la cartella locale", () => {
    expect(isAllowedImageUrl("https://abc123.public.blob.vercel-storage.com/maps/x-AbC.png")).toBe(true)
    expect(isAllowedImageUrl("/uploads/maps/0b1c2d3e-aaaa-bbbb-cccc-111122223333.webp")).toBe(true)
  })

  it("rifiuta altri siti, http e percorsi strani", () => {
    expect(isAllowedImageUrl("https://example.com/mappa.png")).toBe(false)
    expect(isAllowedImageUrl("http://abc.public.blob.vercel-storage.com/x.png")).toBe(false)
    expect(isAllowedImageUrl("/uploads/maps/../../.env")).toBe(false)
    expect(isAllowedImageUrl("javascript:alert(1)")).toBe(false)
  })
})
