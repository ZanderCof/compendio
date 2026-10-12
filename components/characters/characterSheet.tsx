"use client"

import {
  Backpack,
  BicepsFlexed,
  Feather,
  ListChecks,
  Pencil,
  RotateCcw,
  ScrollText,
  Sparkles,
  Swords,
} from "lucide-react"

import { AdvantageToggle } from "@/components/dice/advantageToggle"
import { DiceProvider } from "@/components/dice/diceProvider"
import { DiceTray } from "@/components/dice/diceTray"
import { Button } from "@/components/ui/button"
import type { Character } from "@/features/characters/types"
import { AbilitiesSection } from "./abilitiesSection"
import { AttacksTable } from "./attacksTable"
import { CharacterHeader } from "./characterHeader"
import { CharacterProvider, useCharacter } from "./characterProvider"
import { CombatStats } from "./combatStats"
import { EquipmentSection } from "./equipmentSection"
import { FeaturesSection, ProficienciesSection } from "./featuresSection"
import { PersonalitySection } from "./personalitySection"
import { SheetTabs, type SheetTab } from "./sheetTabs"
import { SkillsList } from "./skillsList"
import { SpellcastingSection } from "./spellcastingSection"

/** Scheda interattiva: stato del personaggio + dadi, con le sezioni cliccabili. */
export function CharacterSheet({ initial }: { initial: Character }) {
  return (
    <CharacterProvider initial={initial}>
      <DiceProvider>
        <SheetBody />
        <DiceTray />
      </DiceProvider>
    </CharacterProvider>
  )
}

function SheetToolbar() {
  const { editing, setEditing, reset } = useCharacter()

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <AdvantageToggle />
      <div className="flex gap-2">
        {editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            title="Scarta tutte le modifiche fatte in questo browser"
          >
            <RotateCcw />
            Ripristina
          </Button>
        )}
        <Button
          variant={editing ? "default" : "outline"}
          size="sm"
          onClick={() => setEditing(!editing)}
          aria-pressed={editing}
        >
          <Pencil />
          {editing ? "Fine modifica" : "Modifica"}
        </Button>
      </div>
    </div>
  )
}

function SheetBody() {
  const { character } = useCharacter()

  const tabs: SheetTab[] = [
    {
      value: "caratteristiche",
      label: "Caratteristiche",
      icon: <BicepsFlexed />,
      content: <AbilitiesSection />,
    },
    { value: "abilita", label: "Abilità", icon: <ListChecks />, content: <SkillsList /> },
    {
      value: "combattimento",
      label: "Combattimento",
      icon: <Swords />,
      content: (
        <>
          <CombatStats />
          <AttacksTable />
        </>
      ),
    },
    ...(character.spellcasting
      ? [
          {
            value: "incantesimi",
            label: "Incantesimi",
            icon: <Sparkles />,
            content: <SpellcastingSection />,
          },
        ]
      : []),
    { value: "inventario", label: "Inventario", icon: <Backpack />, content: <EquipmentSection /> },
    {
      value: "privilegi",
      label: "Privilegi",
      icon: <ScrollText />,
      content: (
        <>
          <FeaturesSection />
          <ProficienciesSection />
        </>
      ),
    },
    { value: "personalita", label: "Personalità", icon: <Feather />, content: <PersonalitySection /> },
  ]

  return (
    <>
      <CharacterHeader />
      <SheetToolbar />
      <SheetTabs tabs={tabs} />
    </>
  )
}
