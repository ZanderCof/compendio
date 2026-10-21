import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Crown, Plus, Swords } from "lucide-react"

import { CharacterCard } from "@/components/characters/characterCard"
import { SheetSection } from "@/components/characters/sheetSection"
import { MissionsCard } from "@/components/profile/missionsCard"
import { SignOutButton, ThemePicker } from "@/components/profile/profileActions"
import { XpCard } from "@/components/profile/xpCard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { listMyCampaigns } from "@/features/campaigns/queries"
import { listMyCharacters } from "@/features/characters/queries"
import { getMissionBoard } from "@/features/missions/queries"
import { getProfileXp } from "@/features/profile/queries"
import { initials } from "@/lib/initials"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Profilo · Compendio" }

const dateFormat = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "Europe/Rome" })

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <Profile />
      </Suspense>
    </main>
  )
}

async function Profile() {
  const user = await requireUser()
  // Prima la bacheca: chiude le missioni finite, così EXP e schede sono già aggiornate
  const board = await getMissionBoard(user.id)
  const [characters, campaigns, xp] = await Promise.all([
    listMyCharacters(user.id),
    listMyCampaigns(user.id),
    getProfileXp(user.id),
  ])
  const asMaster = campaigns.filter((c) => c.role === "MASTER").length

  return (
    <>
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-5">
        <Avatar className="size-20 ring-4 ring-primary/30">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="bg-primary text-2xl text-primary-foreground">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-4xl tracking-wide">{user.name}</h1>
          <p className="truncate text-muted-foreground">{user.email}</p>
          <p className="text-sm text-muted-foreground">Avventuriero da {dateFormat.format(user.createdAt)}</p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Personaggi", value: characters.length },
            { label: "Campagne", value: campaigns.length },
            { label: "Da master", value: asMaster },
          ].map((stat) => (
            <div key={stat.label}>
              <dd className="font-display text-3xl tabular-nums">{stat.value}</dd>
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Esperienza del profilo e missioni dei personaggi */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_3fr]">
        <XpCard progress={xp} />
        <MissionsCard missions={board.missions} characters={board.characters} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <SheetSection
          title="I tuoi personaggi"
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/characters/new">
                <Plus />
                Nuovo
              </Link>
            </Button>
          }
        >
          {characters.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ancora nessun personaggio.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {characters.map((character) => (
                <CharacterCard key={character.id} character={character} href={`/characters/${character.id}`} />
              ))}
            </div>
          )}
        </SheetSection>

        <div className="flex flex-col gap-6">
          <SheetSection title="Le tue campagne">
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Non sei ancora in nessuna campagna.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {campaigns.map((campaign) => (
                  <li key={campaign.id}>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:border-primary/50 hover:bg-secondary/30"
                    >
                      <Swords className="size-4 shrink-0 text-violet" />
                      <span className="min-w-0 flex-1 truncate">{campaign.name}</span>
                      {campaign.role === "MASTER" ? (
                        <Badge>
                          <Crown />
                          Master
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Giocatore</Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SheetSection>

          <SheetSection title="Aspetto">
            <ThemePicker />
          </SheetSection>

          <div className="flex justify-end">
            <SignOutButton />
          </div>
        </div>
      </div>
    </>
  )
}
