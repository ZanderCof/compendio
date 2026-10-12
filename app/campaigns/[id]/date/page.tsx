import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft, CalendarCheck } from "lucide-react"

import { SheetSection } from "@/components/characters/sheetSection"
import { PollBoard, ProposeDatesForm } from "@/components/polls/pollBoard"
import { Button } from "@/components/ui/button"
import { getCampaignForMember } from "@/features/campaigns/queries"
import { formatPollDate } from "@/features/polls/polls"
import { getOpenPoll, getUpcomingSession } from "@/features/polls/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Prossima sessione · Compendio" }

type Params = PageProps<"/campaigns/[id]/date">["params"]

export default function DatePollPage({ params }: PageProps<"/campaigns/[id]/date">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:py-8">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" />}>
        <DatePollLoader params={params} />
      </Suspense>
    </main>
  )
}

async function DatePollLoader({ params }: { params: Params }) {
  const [{ id }, user] = await Promise.all([params, requireUser()])
  const campaign = await getCampaignForMember(id, user.id)
  if (!campaign) notFound()

  const [poll, upcoming] = await Promise.all([getOpenPoll(campaign.id), getUpcomingSession(campaign.id)])
  const isMaster = campaign.role === "MASTER"

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/campaigns/${campaign.id}`}>
          <ArrowLeft />
          {campaign.name}
        </Link>
      </Button>

      <div>
        <h1 className="text-4xl tracking-wide">Prossima sessione</h1>
        <p className="text-muted-foreground">
          {poll ? "Dite quando potete: il master sceglie la data." : "Quando ci vediamo?"}
        </p>
      </div>

      {upcoming && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-aqua bg-aqua/10 p-4">
          <CalendarCheck className="size-6 shrink-0 text-foreground" />
          <div>
            <p className="text-xs tracking-widest text-muted-foreground">Data fissata</p>
            <p className="text-xl tracking-wide">{formatPollDate(upcoming)}</p>
          </div>
        </div>
      )}

      {poll ? (
        <PollBoard campaignId={campaign.id} poll={poll} viewerId={user.id} isMaster={isMaster} />
      ) : isMaster ? (
        <SheetSection title={upcoming ? "Proponi nuove date" : "Proponi le date"}>
          <ProposeDatesForm campaignId={campaign.id} />
        </SheetSection>
      ) : (
        !upcoming && (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Il master non ha ancora proposto le date. Quando lo farà, lo vedrai qui e nel riepilogo.
          </p>
        )
      )}
    </>
  )
}
