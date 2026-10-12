import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft, BookOpen, Lock } from "lucide-react"

import { JournalView } from "@/components/journal/journalView"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCampaignForMember } from "@/features/campaigns/queries"
import { canReadScope, type JournalScope } from "@/features/journal/journal"
import { listJournal } from "@/features/journal/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Diario · Compendio" }

type Props = PageProps<"/campaigns/[id]/diario">

export default function JournalPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <JournalLoader params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function JournalLoader({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()])
  const campaign = await getCampaignForMember(id, user.id)
  if (!campaign) notFound()

  const viewer = { userId: user.id, isMaster: campaign.role === "MASTER" }
  // ?diario=master apre le note private; chi non è master torna al diario del gruppo
  const scope: JournalScope = query.diario === "master" && canReadScope("MASTER", viewer) ? "MASTER" : "SHARED"
  const entries = await listJournal(campaign.id, scope, viewer)
  const base = `/campaigns/${campaign.id}/diario`

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/campaigns/${campaign.id}`}>
          <ArrowLeft />
          {campaign.name}
        </Link>
      </Button>

      <div>
        <h1 className="text-4xl tracking-wide">Diario</h1>
        <p className="text-muted-foreground">
          {scope === "MASTER"
            ? "Le tue note da master: non le vede nessun altro."
            : "Il diario del gruppo: sessioni, PNG e luoghi. Lo scrivete tutti insieme."}
        </p>
      </div>

      {viewer.isMaster && (
        <nav className="flex gap-1 rounded-xl border bg-card p-1.5" aria-label="Quale diario">
          {[
            { href: base, label: "Diario del gruppo", icon: BookOpen, active: scope === "SHARED" },
            { href: `${base}?diario=master`, label: "Note del master", icon: Lock, active: scope === "MASTER" },
          ].map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm tracking-wide transition-colors",
                tab.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </Link>
          ))}
        </nav>
      )}

      {/* key: cambiando diario si riparte da filtri e moduli puliti */}
      <JournalView key={scope} campaignId={campaign.id} scope={scope} entries={entries} />
    </>
  )
}
