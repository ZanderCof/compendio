import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Crown, Swords, Users } from "lucide-react"

import { CreateCampaignForm, JoinCampaignForm } from "@/components/campaigns/campaignForms"
import { ReceivedInvitations } from "@/components/campaigns/receivedInvitations"
import { SheetSection } from "@/components/characters/sheetSection"
import { Badge } from "@/components/ui/badge"
import { listMyCampaigns, listMyInvitations } from "@/features/campaigns/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Campagne · Compendio" }

export default function CampaignsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:py-8">
      <div>
        <h1 className="text-4xl tracking-wide">Le tue campagne</h1>
        <p className="text-muted-foreground">
          Crea una campagna come master o entra in quella di un amico.
        </p>
      </div>

      {/* Sinistra: inviti e campagne. Destra: crea / unisciti. Su telefono la lista viene prima. */}
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
          <CampaignList />
        </Suspense>

        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <SheetSection title="Nuova campagna">
            <CreateCampaignForm />
          </SheetSection>
          <SheetSection title="Unisciti a una campagna">
            <JoinCampaignForm />
          </SheetSection>
        </div>
      </div>
    </main>
  )
}

async function CampaignList() {
  const user = await requireUser()
  const [campaigns, invitations] = await Promise.all([
    listMyCampaigns(user.id),
    listMyInvitations(user.email),
  ])

  return (
    <div className="flex flex-col gap-4">
      <ReceivedInvitations invitations={invitations} />

      {campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Non sei ancora in nessuna campagna. Creane una o usa il link di un amico.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((campaign) => {
            const inSession = campaign._count.sessions > 0
            return (
              <li key={campaign.id}>
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-secondary/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-xl leading-tight tracking-wide">{campaign.name}</h2>
                    <div className="flex gap-2">
                      {inSession && (
                        <Badge className="bg-aqua text-foreground">
                          <Swords />
                          Sessione in corso
                        </Badge>
                      )}
                      {campaign.role === "MASTER" ? (
                        <Badge>
                          <Crown />
                          Master
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Giocatore</Badge>
                      )}
                    </div>
                  </div>
                  {campaign.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{campaign.description}</p>
                  )}
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    {campaign._count.members} {campaign._count.members === 1 ? "membro" : "membri"} ·{" "}
                    {campaign._count.characters} {campaign._count.characters === 1 ? "personaggio" : "personaggi"}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
