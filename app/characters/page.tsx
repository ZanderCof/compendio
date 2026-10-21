import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Plus } from "lucide-react"

import { D20 } from "@/components/brand/d20"
import { CharacterGrid } from "@/components/characters/characterGrid"
import { Button } from "@/components/ui/button"
import { listMyCharacters } from "@/features/characters/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Personaggi · Compendio" }

export default function CharactersPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl tracking-wide">I tuoi personaggi</h1>
          <p className="text-muted-foreground">Apri una scheda o creane una nuova.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/characters/new">
            <Plus />
            Nuovo personaggio
          </Link>
        </Button>
      </div>

      <Suspense fallback={<CardsSkeleton />}>
        <CharacterList />
      </Suspense>
    </main>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-40 rounded-2xl bg-muted" />
      ))}
    </div>
  )
}

async function CharacterList() {
  const user = await requireUser()
  const characters = await listMyCharacters(user.id)

  if (characters.length === 0) {
    return (
      <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed px-6 py-12 text-center">
        <div
          aria-hidden
          className="absolute top-6 size-40 rounded-full bg-linear-to-br from-plum/30 via-violet/20 to-aqua/30 blur-3xl"
        />
        <D20 value={20} motion="spin" className="relative size-24" />
        <h2 className="relative text-3xl tracking-wide">Nessun eroe, per ora</h2>
        <p className="relative max-w-sm text-muted-foreground">
          Crea il tuo primo personaggio: PF, tiri salvezza e slot si calcolano da soli. Ci vogliono un paio di minuti.
        </p>
        <Button asChild size="lg" className="relative">
          <Link href="/characters/new">
            <Plus />
            Crea un personaggio
          </Link>
        </Button>
      </div>
    )
  }

  return <CharacterGrid characters={characters} />
}
