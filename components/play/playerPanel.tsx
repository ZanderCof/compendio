"use client"

import Link from "next/link"
import { ScrollText } from "lucide-react"

import { CharacterHeader } from "@/components/characters/characterHeader"
import { CharacterProvider } from "@/components/characters/characterProvider"
import { CombatStats } from "@/components/characters/combatStats"
import { EditRequestsPanel } from "@/components/characters/editRequests"
import { ResourcesSection } from "@/components/characters/resourcesSection"
import { SpellcastingSection } from "@/components/characters/spellcastingSection"
import { DiceProvider } from "@/components/dice/diceProvider"
import { DiceTray } from "@/components/dice/diceTray"
import { Button } from "@/components/ui/button"
import type { Character } from "@/features/characters/types"
import type { EditRequestView } from "@/features/editRequests/queries"

/**
 * Il personaggio del giocatore in partita, in versione compatta:
 * PF, salute e riposi, capacità e slot. Salva sul database come la scheda completa.
 */
export function PlayerPanel({
  campaignId,
  character,
  requests,
}: {
  campaignId: string
  character: Character
  requests: EditRequestView[]
}) {
  return (
    <CharacterProvider initial={character} access="owner" initialRequests={requests}>
      {/* I tiri passano dal server e finiscono nel feed della sessione */}
      <DiceProvider campaignId={campaignId} characterId={character.id}>
        <div className="flex flex-col gap-4">
          <CharacterHeader />
          <EditRequestsPanel />
          <CombatStats />
          <ResourcesSection />
          <SpellcastingSection />
          <Button variant="outline" asChild className="self-start">
            <Link href={`/characters/${character.id}`}>
              <ScrollText />
              Scheda completa
            </Link>
          </Button>
        </div>
        <DiceTray />
      </DiceProvider>
    </CharacterProvider>
  )
}
