import type { Metadata } from "next"
import { Suspense } from "react"

import { NewCharacterForm } from "@/components/characters/newCharacterForm"
import { listMyCampaigns } from "@/features/campaigns/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Nuovo personaggio · Compendio" }

type SearchParams = PageProps<"/characters/new">["searchParams"]

export default function NewCharacterPage({ searchParams }: PageProps<"/characters/new">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:py-8">
      <div>
        <h1 className="text-4xl tracking-wide">Nuovo personaggio</h1>
        <p className="text-muted-foreground">
          Inserisci le basi: il resto lo completi dalla scheda.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <FormLoader searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function FormLoader({ searchParams }: { searchParams: SearchParams }) {
  const [user, { campaign }] = await Promise.all([requireUser(), searchParams])
  const campaigns = await listMyCampaigns(user.id)

  return (
    <NewCharacterForm
      campaigns={campaigns.map((c) => ({ id: c.id, name: c.name, allowMissionCharacters: c.allowMissionCharacters }))}
      defaultCampaignId={typeof campaign === "string" ? campaign : undefined}
    />
  )
}
