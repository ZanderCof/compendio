import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Plus, UserRound } from "lucide-react"

import { CharacterCard } from "@/components/characters/characterCard"
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
        <div key={i} className="h-32 rounded-xl bg-muted" />
      ))}
    </div>
  )
}

async function CharacterList() {
  const user = await requireUser()
  const characters = await listMyCharacters(user.id)

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-violet">
          <UserRound className="size-6" />
        </span>
        <p className="text-lg">Non hai ancora nessun personaggio</p>
        <p className="text-sm text-muted-foreground">
          Crea il primo: ci vogliono un paio di minuti.
        </p>
        <Button asChild>
          <Link href="/characters/new">
            <Plus />
            Crea un personaggio
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((character) => (
        <CharacterCard key={character.id} character={character} href={`/characters/${character.id}`} />
      ))}
    </div>
  )
}
