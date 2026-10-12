"use client"

import {
  Backpack,
  BicepsFlexed,
  Feather,
  ListChecks,
  CircleAlert,
  Crown,
  CircleCheck,
  Eye,
  LoaderCircle,
  Pencil,
  ScrollText,
  Sparkles,
  Swords,
  Trash2,
} from "lucide-react"

import { AdvantageToggle } from "@/components/dice/advantageToggle"
import { ConfirmButton } from "@/components/shared/confirmButton"
import { DiceProvider } from "@/components/dice/diceProvider"
import { DiceTray } from "@/components/dice/diceTray"
import { Button } from "@/components/ui/button"
import { deleteCharacter } from "@/features/characters/actions"
import type { CharacterAccess } from "@/features/characters/queries"
import type { Character } from "@/features/characters/types"
import type { EditRequestView } from "@/features/editRequests/queries"
import { AbilitiesSection } from "./abilitiesSection"
import { AttacksTable } from "./attacksTable"
import { CharacterHeader } from "./characterHeader"
import { CharacterProvider, useCharacter } from "./characterProvider"
import { CombatStats } from "./combatStats"
import { EditRequestsPanel, ProposalBar } from "./editRequests"
import { EquipmentSection } from "./equipmentSection"
import { FeaturesSection, ProficienciesSection } from "./featuresSection"
import { PersonalitySection } from "./personalitySection"
import { ResourcesSection } from "./resourcesSection"
import { SheetTabs, type SheetTab } from "./sheetTabs"
import { SkillsList } from "./skillsList"
import { SpellcastingSection } from "./spellcastingSection"

/** Scheda interattiva: stato del personaggio + dadi, con le sezioni cliccabili. */
export function CharacterSheet({
  initial,
  access,
  requests,
}: {
  initial: Character
  access: CharacterAccess
  requests: EditRequestView[]
}) {
  return (
    <CharacterProvider initial={initial} access={access} initialRequests={requests}>
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

function DeleteCharacterButton() {
  const { character } = useCharacter()
  return (
    <ConfirmButton
      size="sm"
      icon={<Trash2 />}
      label="Elimina"
      confirmLabel="Tocca di nuovo per eliminare"
      action={() => deleteCharacter(character.id)}
    />
  )
}

function SheetToolbar() {
  const { editing, setEditing, access, proposing, startProposal, saveStatus } = useCharacter()

  if (access === "master") {
    // Mentre prepara una proposta, al posto della barra c'è ProposalBar
    if (proposing) return <ProposalBar />
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdvantageToggle />
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            <Eye className="size-3.5" />
            Scheda di un giocatore
          </span>
          <Button size="sm" onClick={startProposal}>
            <Crown />
            Proponi modifiche
          </Button>
        </div>
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
          <ResourcesSection />
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
      <EditRequestsPanel />
      <SheetToolbar />
      <SheetTabs tabs={tabs} />
    </>
  )
}
