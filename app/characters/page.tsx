import type { Metadata } from "next"

import { ComingSoon } from "@/components/layout/comingSoon"

export const metadata: Metadata = { title: "Personaggi · Compendio" }

export default function CharactersPage() {
  return (
    <ComingSoon
      title="I tuoi personaggi"
      description="Qui potrai creare i tuoi personaggi e aprirne la scheda. In arrivo a breve."
    />
  )
}
