import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { CharacterSheet } from "@/components/characters/characterSheet"
import { getCharacterForViewer } from "@/features/characters/queries"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Scheda personaggio · Compendio" }

type Params = PageProps<"/characters/[id]">["params"]

export default function CharacterPage({ params }: PageProps<"/characters/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Suspense fallback={<CharacterSheetSkeleton />}>
        <CharacterSheetLoader params={params} />
      </Suspense>
    </main>
  )
}

function CharacterSheetSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="h-16 rounded-xl bg-muted" />
      <div className="h-16 rounded-xl bg-muted" />
      <div className="h-12 rounded-xl bg-muted" />
      <div className="h-96 rounded-xl bg-muted" />
    </div>
  )
}

async function CharacterSheetLoader({ params }: { params: Params }) {
  const [{ id }, user] = await Promise.all([params, requireUser()])
  const result = await getCharacterForViewer(id, user.id)
  // Stesso 404 sia se non esiste sia se non è tuo: non si rivela l'esistenza di schede altrui
  if (!result) notFound()

  return (
    <CharacterSheet
      initial={result.character}
      access={result.access}
      requests={result.requests}
    />
  )
}
