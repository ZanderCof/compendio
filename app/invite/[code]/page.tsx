import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { connection } from "next/server"
import { Suspense } from "react"
import { ArrowRight } from "lucide-react"

import { D20 } from "@/components/brand/d20"
import { InviteSignIn } from "@/components/invites/inviteSignIn"
import { SpotlightPanel } from "@/components/invites/spotlightPanel"
import { Button } from "@/components/ui/button"
import { inviteStatus } from "@/features/invites/admission"
import { isPlausibleCode, maskCode } from "@/features/invites/rules"
import { prisma } from "@/lib/prisma"
import { clientIp, rateLimit } from "@/lib/rateLimit"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Invito · Compendio" }

export default function InvitePage({ params }: PageProps<"/invite/[code]">) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-muted" />}>
        <Invite params={params} />
      </Suspense>
    </main>
  )
}

async function Invite({ params }: { params: PageProps<"/invite/[code]">["params"] }) {
  const [{ code }, requestHeaders, session] = await Promise.all([params, headers(), getSession()])

  // Chi è già registrato non ha bisogno dell'invito
  if (session) {
    return (
      <SpotlightPanel className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
          <h1 className="text-4xl tracking-wide">Sei già dei nostri</h1>
          <p className="text-muted-foreground">Hai già un account su Compendio: puoi entrare direttamente.</p>
          <Button asChild size="lg">
            <Link href="/characters">
              I tuoi personaggi
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </SpotlightPanel>
    )
  }

  // Limite leggero: chi prova codici a tappeto vede solo "non valido". Va calcolato a ogni richiesta
  await connection()
  const allowed = rateLimit(`invite:${clientIp(requestHeaders)}`, 20, 60_000)
  const valid = allowed && isPlausibleCode(code) && (await inviteStatus(prisma, code)) === "valid"

  if (!valid) {
    console.info(`[inviti] link non valido: ${maskCode(code)}${allowed ? "" : " (limite superato)"}`)
    return (
      <SpotlightPanel className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
          <D20 value={1} className="size-20" />
          <h1 className="text-4xl tracking-wide">Invito scaduto o non valido</h1>
          <p className="text-muted-foreground">
            Questo link non funziona più. Chiedine uno nuovo a chi ti ha invitato.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Torna alla home</Link>
          </Button>
        </div>
      </SpotlightPanel>
    )
  }

  return (
    <SpotlightPanel className="w-full max-w-md">
      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-linear-to-br from-plum/40 via-violet/30 to-aqua/30 blur-2xl"
          />
          <D20 value={20} motion="spin" className="relative size-28" />
        </div>
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Benvenuto</p>
          <h1 className="text-shiny mt-1 text-4xl leading-tight tracking-wide">Sei stato invitato su Compendio</h1>
        </div>
        <p className="text-muted-foreground">
          Schede, dadi, mappa e campagne del tuo gruppo, tutto in un posto. Accedi con Google per entrare.
        </p>
        <InviteSignIn code={code} />
        <p className="text-xs text-muted-foreground">Dopo il clic hai 30 minuti per completare l&apos;accesso.</p>
      </div>
    </SpotlightPanel>
  )
}
