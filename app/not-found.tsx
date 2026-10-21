import type { Metadata } from "next"
import Link from "next/link"
import { Home, Swords } from "lucide-react"

import { D20 } from "@/components/brand/d20"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Pagina non trovata · Compendio" }

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <D20 value={1} motion="roll" className="size-36 md:size-44" />
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm tracking-widest text-muted-foreground uppercase">Errore 404</p>
        <h1 className="text-4xl tracking-wide md:text-5xl">Hai tirato un 1 naturale</h1>
        <p className="text-muted-foreground">
          La pagina che cerchi non esiste, o è finita in una botola. Capita anche ai migliori avventurieri.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">
            <Home />
            Torna alla home
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/campaigns">
            <Swords />
            Le tue campagne
          </Link>
        </Button>
      </div>
    </main>
  )
}
