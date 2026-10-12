import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Crown, Plus } from "lucide-react"

import { AddCharacterToCampaign, InvitePanel } from "@/components/campaigns/campaignActions"
import { CharacterCard } from "@/components/characters/characterCard"
import { SheetSection } from "@/components/characters/sheetSection"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCampaignForMember } from "@/features/campaigns/queries"
import { listCampaignCharacters, listMyCharacters } from "@/features/characters/queries"
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

  const [characters, myCharacters] = await Promise.all([
    listCampaignCharacters(campaign.id),
    listMyCharacters(user.id),
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
          <Badge className="h-6 px-3">
            <Crown />
            Sei il master
          </Badge>
        ) : (
          <Badge variant="secondary" className="h-6 px-3">
            Sei un giocatore
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
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
          {characters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun personaggio in questa campagna. Creane uno o porta uno dei tuoi.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  showOwner
                  // La scheda la apre il proprietario o il master
                  href={isMaster || character.ownerId === user.id ? `/characters/${character.id}` : undefined}
                />
              ))}
            </div>
          )}

          {addable.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs tracking-widest text-muted-foreground">Porta un tuo personaggio</p>
              <AddCharacterToCampaign campaignId={campaign.id} characters={addable} />
            </div>
          )}
        </SheetSection>

        <div className="flex flex-col gap-6">
          {isMaster && campaign.inviteCode && (
            <SheetSection title="Invita i giocatori">
              <InvitePanel campaignId={campaign.id} inviteCode={campaign.inviteCode} />
            </SheetSection>
          )}

          <SheetSection title="Membri">
            <ul className="flex flex-col gap-2">
              {campaign.members.map((member) => (
                <li key={member.user.id} className="flex items-center gap-3">
                  <Avatar className="size-8">
                    {member.user.image && <AvatarImage src={member.user.image} alt="" />}
                    <AvatarFallback>{member.user.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">
                    {member.user.name}
                    {member.user.id === user.id && <span className="text-muted-foreground"> (tu)</span>}
                  </span>
                  {member.role === "MASTER" && (
                    <Badge>
                      <Crown />
                      Master
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </SheetSection>
        </div>
      </div>
    </>
  )
}
