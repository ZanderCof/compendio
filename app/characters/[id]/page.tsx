import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { CharacterSheet as InteractiveSheet } from "@/components/characters/characterSheet"
import { getCharacter } from "@/features/characters/data"

export async function generateMetadata({
  params,
}: PageProps<"/characters/[id]">): Promise<Metadata> {
  const { id } = await params
  const character = await getCharacter(id)
  return { title: character ? `${character.name} · Compendio` : "Personaggio non trovato" }
}

type Params = PageProps<"/characters/[id]">["params"]

export default function CharacterPage({ params }: PageProps<"/characters/[id]">) {
  return (
    <Suspense fallback={<CharacterSheetSkeleton />}>
      <CharacterSheet params={params} />
    </Suspense>
  )
}

function CharacterSheetSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-3xl animate-pulse flex-col gap-4 p-4">
      <div className="h-16 rounded-xl bg-muted" />
      <div className="h-16 rounded-xl bg-muted" />
      <div className="h-12 rounded-xl bg-muted" />
      <div className="h-96 rounded-xl bg-muted" />
    </main>
  )
}

async function CharacterSheet({ params }: { params: Params }) {
  const { id } = await params
  const character = await getCharacter(id)
  if (!character) notFound()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <InteractiveSheet initial={character} />
    </main>
  )
}
