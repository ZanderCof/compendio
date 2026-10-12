import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { LogIn, Users, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { joinCampaign } from "@/features/campaigns/actions"
import { declineInviteLink } from "@/features/campaigns/invitations"
import { getCampaignByInviteCode } from "@/features/campaigns/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Invito · Compendio" }

type Params = PageProps<"/join/[code]">["params"]

export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Suspense fallback={<div className="h-56 w-full max-w-sm animate-pulse rounded-xl bg-muted" />}>
        <Invite params={params} />
      </Suspense>
    </main>
  )
}

async function Invite({ params }: { params: Params }) {
  // Il login serve prima di entrare: il proxy rimanda qui dopo l'accesso
  const [{ code }] = await Promise.all([params, requireUser()])
  const campaign = await getCampaignByInviteCode(code)

  if (!campaign) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <h1 className="text-3xl tracking-wide">Invito non valido</h1>
          <p className="text-muted-foreground">
            Il link è sbagliato o il master l&apos;ha sostituito con uno nuovo. Chiedigliene un altro.
          </p>
          <Button asChild variant="outline">
            <Link href="/campaigns">Le tue campagne</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const master = campaign.members[0]?.user.name

  async function join() {
    "use server"
    // Se il codice è ancora valido, joinCampaign porta alla campagna; altrimenti si ricarica l'invito
    await joinCampaign(code)
  }

  async function decline() {
    "use server"
    // Registra il rifiuto: il master lo vede nel gruppo
    await declineInviteLink(code)
  }

  return (
    <Card className="relative w-full max-w-sm overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-plum via-periwinkle to-aqua" />
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-xs tracking-widest text-muted-foreground">Sei stato invitato a</p>
        <h1 className="text-4xl leading-none tracking-wide">{campaign.name}</h1>
        {campaign.description && <p className="text-muted-foreground">{campaign.description}</p>}
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="size-4" />
          {master ? `Master: ${master} · ` : ""}
          {campaign._count.members} membri
        </p>
        <form action={join} className="w-full">
          <Button type="submit" size="lg" className="w-full">
            <LogIn />
            Unisciti come giocatore
          </Button>
        </form>
        <form action={decline} className="w-full">
          <Button type="submit" variant="ghost" className="w-full text-muted-foreground">
            <X />
            No grazie
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
