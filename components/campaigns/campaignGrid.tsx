"use client"

import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, CalendarDays, Crown, Swords, UserRound } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { campaignCover } from "@/features/campaigns/cover"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

export type CampaignListItem = {
  id: string
  name: string
  description: string | null
  role: "MASTER" | "PLAYER"
  memberPreview: { id: string; name: string; image: string | null }[]
  _count: { members: number; characters: number; sessions: number }
  awaitingVote: boolean
}

/** Motivi di sfondo della copertina, sopra il gradiente. */
const PATTERNS = [
  "radial-gradient(circle at 20% 20%, rgba(255,255,255,.28) 0 2px, transparent 3px) 0 0 / 18px 18px",
  "repeating-linear-gradient(45deg, rgba(255,255,255,.14) 0 6px, transparent 6px 14px)",
  "radial-gradient(circle at 100% 0%, rgba(255,255,255,.3), transparent 55%), radial-gradient(circle at 0% 100%, rgba(0,0,0,.18), transparent 50%)",
]

function CampaignCover({ name }: { name: string }) {
  const cover = campaignCover(name)
  return (
    <div
      aria-hidden
      className="relative flex w-24 shrink-0 items-center justify-center self-stretch overflow-hidden sm:w-28"
      style={{ background: `linear-gradient(${cover.angle}deg, ${cover.from}, ${cover.to})` }}
    >
      <div className="absolute inset-0" style={{ background: PATTERNS[cover.pattern] }} />
      <span className="font-display relative text-4xl text-white drop-shadow-sm">{cover.initials}</span>
    </div>
  )
}

/** Pila di avatar dei membri, con "+N" per gli altri. */
function MemberStack({ members, total }: { members: CampaignListItem["memberPreview"]; total: number }) {
  const shown = members.slice(0, 4)
  const others = total - shown.length
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((member) => (
          <Avatar key={member.id} className="size-7 ring-2 ring-card" title={member.name}>
            {member.image && <AvatarImage src={member.image} alt="" />}
            <AvatarFallback className="bg-secondary text-[0.65rem]">{initials(member.name)}</AvatarFallback>
          </Avatar>
        ))}
        {others > 0 && (
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[0.65rem] ring-2 ring-card">
            +{others}
          </span>
        )}
      </div>
      <span className="sr-only">
        {total} {total === 1 ? "membro" : "membri"}: {members.map((m) => m.name).join(", ")}
      </span>
    </div>
  )
}

function CampaignCard({ campaign }: { campaign: CampaignListItem }) {
  const inSession = campaign._count.sessions > 0
  const href = `/campaigns/${campaign.id}`

  return (
    <article
      className={cn(
        "group relative flex h-full overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50",
        inSession && "border-glow border-transparent"
      )}
    >
      {/* Tutta la card porta alla campagna; i pulsanti sopra restano link a sé */}
      <Link href={href} className="absolute inset-0 z-0 outline-none" aria-label={`Apri ${campaign.name}`} />
      <CampaignCover name={campaign.name} />

      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {campaign.role === "MASTER" ? (
            <Badge>
              <Crown />
              Master
            </Badge>
          ) : (
            <Badge variant="secondary">
              <UserRound />
              Giocatore
            </Badge>
          )}
          {inSession && (
            <Badge className="bg-aqua text-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-foreground/60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-foreground" />
              </span>
              Sessione in corso
            </Badge>
          )}
          {campaign.awaitingVote && (
            <Badge variant="outline" className="border-primary text-primary">
              <CalendarDays />
              Vota le date
            </Badge>
          )}
        </div>

        <h2 className="truncate text-2xl leading-tight tracking-wide">{campaign.name}</h2>
        {campaign.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{campaign.description}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MemberStack members={campaign.memberPreview} total={campaign._count.members} />
            <span>
              {campaign._count.characters} {campaign._count.characters === 1 ? "personaggio" : "personaggi"}
            </span>
          </div>
          {inSession && (
            <Button asChild size="sm" className="pointer-events-auto relative z-10 shadow-md shadow-aqua/40">
              <Link href={`${href}/play`}>
                <Swords />
                Entra
                <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

/** Campagne in griglia: una campagna appena creata entra in cima con un'animazione. */
export function CampaignGrid({ campaigns }: { campaigns: CampaignListItem[] }) {
  const reduced = useReducedMotion()
  return (
    <motion.ul layout={!reduced} className="grid gap-4 lg:grid-cols-2">
      <AnimatePresence initial={false}>
        {campaigns.map((campaign) => (
          <motion.li
            key={campaign.id}
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <CampaignCard campaign={campaign} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  )
}
