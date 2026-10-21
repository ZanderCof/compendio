import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft, Hourglass, Plus } from "lucide-react"

import { CampaignChat } from "@/components/campaigns/campaignChat"
import { SheetSection } from "@/components/characters/sheetSection"
import { MasterDice } from "@/components/play/masterPanel"
import { SessionFeed } from "@/components/play/sessionFeed"
import { PlayerPanel } from "@/components/play/playerPanel"
import { PlaySession } from "@/components/play/playSession"
import { Button } from "@/components/ui/button"
import { getCampaignForMember } from "@/features/campaigns/queries"
import { getMyCharacterInCampaign } from "@/features/characters/queries"
import { listRecentMessages } from "@/features/chat/queries"
import { getActiveMap } from "@/features/maps/queries"
import { uploadMode } from "@/features/maps/upload"
import { listSessionFeed } from "@/features/rolls/queries"
import { getSessionState } from "@/features/sessions/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Sessione · Compendio" }

type Params = PageProps<"/campaigns/[id]/play">["params"]

export default function PlayPage({ params }: PageProps<"/campaigns/[id]/play">) {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 md:py-6">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <PlayLoader params={params} />
      </Suspense>
    </main>
  )
}

const timeFormat = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })

async function PlayLoader({ params }: { params: Params }) {
  const [{ id }, user] = await Promise.all([params, requireUser()])
  const campaign = await getCampaignForMember(id, user.id)
  if (!campaign) notFound()

  const isMaster = campaign.role === "MASTER"
  const session = await getSessionState(campaign.id, user.id)
  const [feed, map, messages] = session.active
    ? await Promise.all([
        listSessionFeed(session.active.id, user.id),
        getActiveMap(campaign.id, isMaster),
        listRecentMessages(campaign.id),
      ])
    : [[], null, []]
  const back = (
    <Button variant="ghost" size="sm" asChild className="self-start">
      <Link href={`/campaigns/${campaign.id}`}>
        <ArrowLeft />
        Riepilogo
      </Link>
    </Button>
  )

  if (!session.active) {
    return (
      <>
        {back}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <Hourglass className="size-8 text-violet" />
          <h1 className="text-3xl tracking-wide">La sessione non è ancora iniziata</h1>
          <p className="text-muted-foreground">
            {isMaster
              ? "Avviala dal riepilogo della campagna."
              : "Quando il master la avvia, il pulsante nel riepilogo diventa “Entra nella sessione”."}
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <PlaySession
        campaignId={campaign.id}
        campaignName={campaign.name}
        startedAtLabel={timeFormat.format(new Date(session.active.startedAt))}
        isMaster={isMaster}
        uploadMode={isMaster ? uploadMode() : null}
        initialMap={map}
        sheetLabel={isMaster ? "Dadi" : "Personaggio"}
        sheet={
          isMaster ? (
            // Strumenti del master: per ora i dadi; l'iniziativa arriverà qui
            <SheetSection title="Dadi del master">
              <MasterDice campaignId={campaign.id} />
            </SheetSection>
          ) : (
            <PlayerSide campaignId={campaign.id} userId={user.id} />
          )
        }
        feed={
          <SheetSection title="Tiri della sessione">
            <SessionFeed campaignId={campaign.id} viewerId={user.id} initial={feed} />
          </SheetSection>
        }
        chat={<CampaignChat campaignId={campaign.id} viewerId={user.id} initial={messages} fill />}
      />
    </>
  )
}

async function PlayerSide({ campaignId, userId }: { campaignId: string; userId: string }) {
  const mine = await getMyCharacterInCampaign(campaignId, userId)
  if (!mine) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
        <p className="text-lg">Non hai un personaggio in questa campagna</p>
        <Button asChild>
          <Link href={`/characters/new?campaign=${campaignId}`}>
            <Plus />
            Crea un personaggio
          </Link>
        </Button>
      </div>
    )
  }
  return <PlayerPanel campaignId={campaignId} character={mine.character} requests={mine.requests} />
}
