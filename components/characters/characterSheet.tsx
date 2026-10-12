"use client"

import {
  Backpack,
  BicepsFlexed,
  Feather,
  ListChecks,
  CircleAlert,
  CircleCheck,
  Eye,
  LoaderCircle,
  Pencil,
  ScrollText,
  Sparkles,
  Swords,
  Trash2,
} from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { AdvantageToggle } from "@/components/dice/advantageToggle"
import { DiceProvider } from "@/components/dice/diceProvider"
import { DiceTray } from "@/components/dice/diceTray"
import { Button } from "@/components/ui/button"
import { deleteCharacter } from "@/features/characters/actions"
import type { CharacterAccess } from "@/features/characters/queries"
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
export function CharacterSheet({
  initial,
  access,
}: {
  initial: Character
  access: CharacterAccess
}) {
  return (
    <CharacterProvider initial={initial} access={access}>
      <DiceProvider>
        <SheetBody />
        <DiceTray />
      </DiceProvider>
    </CharacterProvider>
  )
}

const SAVE_STATUS = {
  saved: { icon: CircleCheck, label: "Salvato", className: "text-muted-foreground" },
  saving: { icon: LoaderCircle, label: "Salvataggio…", className: "text-muted-foreground [&_svg]:animate-spin" },
  error: { icon: CircleAlert, label: "Non salvato", className: "text-destructive" },
} as const

/** Elimina con doppio tocco: il primo chiede conferma, il secondo elimina davvero. */
function DeleteCharacterButton() {
  const { character } = useCharacter()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 4000)
      return
    }
    startTransition(async () => {
      const result = await deleteCharacter(character.id)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleClick} disabled={pending}>
      <Trash2 />
      {confirming ? "Tocca di nuovo per eliminare" : "Elimina"}
    </Button>
  )
}

function SheetToolbar() {
  const { editing, setEditing, readOnly, saveStatus } = useCharacter()

  if (readOnly) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdvantageToggle />
        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
          <Eye className="size-3.5" />
          Sola lettura: è la scheda di un giocatore
        </span>
      </div>
    )
  }

  const status = SAVE_STATUS[saveStatus]
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <AdvantageToggle />
      <div className="flex items-center gap-3">
        <span className={`flex items-center gap-1 text-xs ${status.className}`} role="status">
          <status.icon className="size-3.5" />
          {status.label}
        </span>
        {editing && <DeleteCharacterButton />}
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
