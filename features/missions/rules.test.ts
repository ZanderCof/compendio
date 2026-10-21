import { describe, expect, it } from "vitest"

import { canJoinCampaign, missionStatus } from "./rules"

describe("missionStatus", () => {
  it("personaggio normale: niente missioni, con o senza campagna", () => {
    expect(missionStatus({ missionsEnabled: false, campaignId: null })).toBe("disabled")
    expect(missionStatus({ missionsEnabled: false, campaignId: "c1" })).toBe("disabled")
  })

  it("abilitato: a casa può partire, in campagna aspetta", () => {
    expect(missionStatus({ missionsEnabled: true, campaignId: null })).toBe("home")
    expect(missionStatus({ missionsEnabled: true, campaignId: "c1" })).toBe("away")
  })
})

describe("canJoinCampaign", () => {
  it("i personaggi normali entrano ovunque", () => {
    expect(canJoinCampaign(false, true)).toBe(true)
    expect(canJoinCampaign(false, false)).toBe(true)
  })

  it("quelli con le missioni solo se il master li ammette", () => {
    expect(canJoinCampaign(true, true)).toBe(true)
    expect(canJoinCampaign(true, false)).toBe(false)
  })
})
