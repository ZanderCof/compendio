import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { D20 } from "@/components/brand/d20"
import { SpotlightPanel } from "@/components/invites/spotlightPanel"
import { Button } from "@/components/ui/button"
import { INVITE_REQUIRED_ERROR } from "@/features/invites/rules"

export const metadata: Metadata = { title: "Accesso su invito · Compendio" }

export default function InviteRequiredPage({ searchParams }: PageProps<"/accesso-su-invito">) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Suspense fallback={<div className="h-80 w-full max-w-md animate-pulse rounded-2xl bg-muted" />}>
        <Message searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Message({ searchParams }: { searchParams: PageProps<"/accesso-su-invito">["searchParams"] }) {
  const { error } = await searchParams
  // Better Auth rimanda qui anche per gli altri errori di accesso con Google
  const otherError = typeof error === "string" && error !== INVITE_REQUIRED_ERROR

  return (
    <SpotlightPanel className="w-full max-w-md">
      <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
        <D20 value={otherError ? 1 : 12} className="size-20" />
        {otherError ? (
          <>
            <h1 className="text-4xl tracking-wide">Accesso non riuscito</h1>
            <p className="text-muted-foreground">Qualcosa è andato storto con Google. Riprova tra un attimo.</p>
            <Button asChild>
              <Link href="/login">Riprova</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-4xl tracking-wide">Si entra su invito</h1>
            <p className="text-muted-foreground">
              Compendio è in fase di test e per ora si entra solo su invito. Chiedi un link al tuo master.
            </p>
            <p className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              Abbiamo inviato la tua richiesta: quando verrà approvata potrai accedere con lo stesso account Google.
            </p>
            <p className="text-sm text-muted-foreground">
              Hai già un account? Accedi con lo stesso indirizzo Google di sempre.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/login">Accedi</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Torna alla home</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </SpotlightPanel>
  )
}
