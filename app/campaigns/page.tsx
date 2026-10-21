import type { Metadata } from "next"
import { Suspense } from "react"

import { D20 } from "@/components/brand/d20"
import { JoinCampaignDialog, NewCampaignDialog } from "@/components/campaigns/campaignForms"
import { CampaignGrid } from "@/components/campaigns/campaignGrid"
import { ReceivedInvitations } from "@/components/campaigns/receivedInvitations"
import { listMyCampaigns, listMyInvitations } from "@/features/campaigns/queries"
import { campaignsAwaitingVote } from "@/features/polls/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Campagne · Compendio" }

export default function CampaignsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl tracking-wide">Le tue campagne</h1>
          <p className="text-muted-foreground">Crea una campagna come master o entra in quella di un amico.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <JoinCampaignDialog />
          <NewCampaignDialog />
        </div>
      </div>

      <Suspense fallback={<CardsSkeleton />}>
        <CampaignList />
      </Suspense>
    </main>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="h-36 rounded-2xl bg-muted" />
      ))}
    </div>
  )
}

async function CampaignList() {
  const user = await requireUser()
  const [campaigns, invitations, awaiting] = await Promise.all([
    listMyCampaigns(user.id),
    listMyInvitations(user.email),
    campaignsAwaitingVote(user.id),
  ])

  return (
    <div className="flex flex-col gap-4">
      <ReceivedInvitations invitations={invitations} />

      {campaigns.length === 0 ? (
        <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed px-6 py-12 text-center">
          <div
            aria-hidden
            className="absolute top-6 size-40 rounded-full bg-linear-to-br from-violet/30 via-periwinkle/20 to-aqua/30 blur-3xl"
          />
          <D20 value={12} motion="spin" className="relative size-24" />
          <h2 className="relative text-3xl tracking-wide">Nessuna campagna, per ora</h2>
          <p className="relative max-w-sm text-muted-foreground">
            Creane una e diventa master, oppure entra con il link che ti ha mandato un amico.
          </p>
          <div className="relative flex flex-wrap justify-center gap-2">
            <JoinCampaignDialog />
            <NewCampaignDialog />
          </div>
        </div>
      ) : (
        <CampaignGrid
          campaigns={campaigns.map((campaign) => ({ ...campaign, awaitingVote: awaiting.includes(campaign.id) }))}
        />
      )}
    </div>
  )
}
