import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Crown, Plus } from "lucide-react"

import {
  AddCharacterToCampaign,
  InvitePanel,
  LeaveCampaignButton,
} from "@/components/campaigns/campaignActions"
import { CampaignChat } from "@/components/campaigns/campaignChat"
import { CampaignGroup } from "@/components/campaigns/campaignGroup"
import { CampaignSettings } from "@/components/campaigns/campaignSettings"
import { JournalCard, NextDateCard } from "@/components/campaigns/recapCards"
import { SessionPanel } from "@/components/campaigns/sessionPanel"
import { SheetSection } from "@/components/characters/sheetSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCampaignGroup } from "@/features/campaigns/group"
import { getCampaignForMember } from "@/features/campaigns/queries"
import { listMyCharacters } from "@/features/characters/queries"
import { listRecentMessages } from "@/features/chat/queries"
import { campaignsAwaitingVote, getOpenPoll, getUpcomingSession } from "@/features/polls/queries"
import { getSessionState } from "@/features/sessions/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Campagna · Compendio" }

type Params = PageProps<"/campaigns/[id]">["params"]

export default function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <CampaignLoader params={params} />
      </Suspense>
    </main>
  )
}

async function CampaignLoader({ params }: { params: Params }) {
  const [{ id }, user] = await Promise.all([params, requireUser()])
  const campaign = await getCampaignForMember(id, user.id)
  if (!campaign) notFound()

  const [group, myCharacters, session, messages, poll, awaiting, upcoming] = await Promise.all([
    getCampaignGroup(campaign.id, user.id),
    listMyCharacters(user.id),
    getSessionState(campaign.id, user.id),
    listRecentMessages(campaign.id),
    getOpenPoll(campaign.id),
    campaignsAwaitingVote(user.id),
    getUpcomingSession(campaign.id),
  ])
  const isMaster = campaign.role === "MASTER"
  const addable = myCharacters
    .filter((c) => c.campaign?.id !== campaign.id)
    .map((c) => ({ id: c.id, name: c.name, campaignName: c.campaign?.name ?? null }))

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl tracking-wide">{campaign.name}</h1>
          {campaign.description && <p className="mt-1 max-w-2xl text-muted-foreground">{campaign.description}</p>}
        </div>
        {isMaster ? (
          <div className="flex items-center gap-2">
            <Badge className="h-6 px-3">
              <Crown />
              Sei il master
            </Badge>
            <CampaignSettings
              campaignId={campaign.id}
              name={campaign.name}
              description={campaign.description}
            />
          </div>
        ) : (
          <Badge variant="secondary" className="h-6 px-3">
            Sei un giocatore
          </Badge>
        )}
      </div>

      {/* Riquadri piccoli affiancati: sessione, data della prossima, diario */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SessionPanel campaignId={campaign.id} isMaster={isMaster} initial={session} />
        <NextDateCard
          campaignId={campaign.id}
          upcoming={upcoming}
          hasOpenPoll={poll !== null}
          awaitingVote={awaiting.includes(campaign.id)}
          isMaster={isMaster}
        />
        <JournalCard campaignId={campaign.id} isMaster={isMaster} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <SheetSection
          title="Il gruppo"
          action={
            <Button asChild size="sm" variant="outline">
              <Link href={`/characters/new?campaign=${campaign.id}`}>
                <Plus />
                Nuovo personaggio
              </Link>
            </Button>
          }
        >
          <CampaignGroup campaignId={campaign.id} initial={group} isMaster={isMaster} viewerId={user.id} />

          {addable.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs tracking-widest text-muted-foreground">Porta un tuo personaggio</p>
              <AddCharacterToCampaign campaignId={campaign.id} characters={addable} />
            </div>
          )}

          {isMaster ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Chi viene rimosso tiene i suoi personaggi, che escono dalla campagna.
            </p>
          ) : (
            <div className="mt-4 border-t pt-4">
              <LeaveCampaignButton campaignId={campaign.id} />
            </div>
          )}
        </SheetSection>

        <div className="flex flex-col gap-6">
          <SheetSection title="Chat">
            <CampaignChat campaignId={campaign.id} viewerId={user.id} initial={messages} />
          </SheetSection>

          {isMaster && campaign.inviteCode && (
            <SheetSection title="Link di invito">
              <InvitePanel campaignId={campaign.id} inviteCode={campaign.inviteCode} />
            </SheetSection>
          )}
        </div>
      </div>
    </>
  )
}
