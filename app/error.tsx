"use client" // I confini di errore devono essere componenti client

import { useEffect } from "react"
import Link from "next/link"
import { Home, RotateCcw } from "lucide-react"

import { D20 } from "@/components/brand/d20"
import { Button } from "@/components/ui/button"

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <D20 value={1} motion="roll" className="size-32 md:size-40" />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl tracking-wide md:text-5xl">Tiro salvezza fallito</h1>
        <p className="text-muted-foreground">
          Qualcosa è andato storto mentre caricavo la pagina. Riprova: spesso basta un secondo tiro.
        </p>
        {error.digest && <p className="text-xs text-muted-foreground">Codice: {error.digest}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => retry()}>
          <RotateCcw />
          Riprova
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">
            <Home />
            Torna alla home
          </Link>
        </Button>
      </div>
    </main>
  )
}
