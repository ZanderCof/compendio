import type { Metadata } from "next"

import { ComingSoon } from "@/components/layout/comingSoon"

export const metadata: Metadata = { title: "Campagne · Compendio" }

export default function CampaignsPage() {
  return (
    <ComingSoon
      title="Le tue campagne"
      description="Qui potrai creare una campagna come master o entrare in quella di un amico con il link di invito. In arrivo a breve."
    />
  )
}
