import Link from "next/link"
import { BookOpen, CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatPollDate } from "@/features/polls/polls"

const cardClass =
  "flex flex-col justify-between gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-secondary/30"

function CardHeading({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  dot,
}: {
  icon: typeof BookOpen
  iconClass: string
  title: string
  subtitle: string
  dot?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full", iconClass)}>
        <Icon className="size-4" />
        {dot && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" />}
      </span>
      <div className="min-w-0">
        <h2 className="truncate leading-tight tracking-wide">{title}</h2>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

/** Riquadro "Data": data fissata, sondaggio da votare o niente ancora. */
export function NextDateCard({
  campaignId,
  upcoming,
  hasOpenPoll,
  awaitingVote,
  isMaster,
}: {
  campaignId: string
  /** Solo se futura (la filtra la query) */
  upcoming: Date | null
  hasOpenPoll: boolean
  awaitingVote: boolean
  isMaster: boolean
}) {
  const subtitle = hasOpenPoll
    ? awaitingVote
      ? "Sondaggio aperto: vota!"
      : "Sondaggio aperto, hai votato"
    : upcoming
      ? formatPollDate(upcoming)
      : isMaster
        ? "Proponi le date al gruppo"
        : "Ancora da decidere"

  return (
    <Link href={`/campaigns/${campaignId}/date`} className={cardClass}>
      <CardHeading
        icon={CalendarDays}
        iconClass="bg-sky/25 text-foreground"
        title="Prossima data"
        subtitle={subtitle}
        dot={awaitingVote}
      />
      <span className="text-xs text-primary">
        {hasOpenPoll ? "Apri il sondaggio →" : isMaster ? "Gestisci le date →" : "Dettagli →"}
      </span>
    </Link>
  )
}

export function JournalCard({ campaignId, isMaster }: { campaignId: string; isMaster: boolean }) {
  return (
    <Link href={`/campaigns/${campaignId}/diario`} className={cardClass}>
      <CardHeading
        icon={BookOpen}
        iconClass="bg-violet/15 text-violet"
        title="Diario"
        subtitle={isMaster ? "Sessioni, PNG, luoghi e note private" : "Sessioni, PNG e luoghi"}
      />
      <span className="text-xs text-primary">Apri il diario →</span>
    </Link>
  )
}
