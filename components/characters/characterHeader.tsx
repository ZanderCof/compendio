"use client"

import { Sparkle } from "lucide-react"

import { CountUp } from "@/components/effects/countUp"
import { RollButton } from "@/components/dice/rollButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { classTone } from "@/features/characters/look"
import { cn } from "@/lib/utils"
import { initiative, proficiencyBonus } from "@/features/characters/rules"
import { useCharacter } from "./characterProvider"
import { HpRing } from "./hpRing"
import { NumberField } from "./numberField"
import { initials } from "@/lib/initials"

/** Statistica rapida: valore grande e nome sotto, con la spiegazione nel tooltip del nome. */
function QuickStat({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex h-8 items-center text-2xl leading-none">{children}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="mt-1 cursor-help rounded text-center text-xs tracking-widest text-muted-foreground underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-60 text-center text-sm">{help}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function CharacterHeader() {
  const { character, dispatch, editing } = useCharacter()
  const initialsText = initials(character.name)

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* Avatar: per ora le iniziali, poi un'immagine */}
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-plum to-violet text-2xl text-primary-foreground ring-3 ring-offset-2 ring-offset-background",
            classTone(character.className).ring
          )}
        >
          {initialsText}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl leading-tight tracking-wide">{character.name}</h1>
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            {character.race} · {character.className}{" "}
            {editing ? (
              <NumberField
                label="Livello"
                value={character.level}
                min={1}
                max={20}
                onCommit={(value) => dispatch({ type: "setStat", stat: "level", value })}
                className="h-6 w-10 text-sm"
              />
            ) : (
              character.level
            )}
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "toggleInspiration" })}
            aria-pressed={character.inspiration}
            className={cn(
              "mt-1 inline-flex h-5 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
              character.inspiration
                ? "border-transparent bg-secondary text-secondary-foreground"
                : "border-dashed text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkle className={cn("size-3", character.inspiration && "fill-current text-primary")} />
            Ispirazione
          </button>
        </div>

        <HpRing />
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-xl border bg-card px-2 py-3">
        <QuickStat
          label="Competenza"
          help="Si somma ai tiri in cui sei competente. Cresce con il livello: +2 dal 1° al 4°, +3 dal 5° all'8° e così via."
        >
          <CountUp value={proficiencyBonus(character.level)} signed />
        </QuickStat>
        <QuickStat label="Velocità" help="Quanti metri puoi percorrere nel tuo turno.">
          {editing ? (
            <NumberField
              label="Velocità"
              value={character.speed}
              onCommit={(value) => dispatch({ type: "setStat", stat: "speed", value })}
            />
          ) : (
            <>
              <CountUp value={character.speed} />
              <span className="ml-0.5 text-xs text-muted-foreground">m</span>
            </>
          )}
        </QuickStat>
        <QuickStat
          label="Iniziativa"
          help="Il tuo modificatore di Destrezza: si somma al d20 per decidere l'ordine dei turni. Tocca il valore per tirare."
        >
          <RollButton label="Iniziativa" bonus={initiative(character)} className="px-2">
            <CountUp value={initiative(character)} signed />
          </RollButton>
        </QuickStat>
        <QuickStat
          label="Classe Armatura"
          help="Quanto è difficile colpirti: un attacco va a segno se il tiro eguaglia o supera la tua CA."
        >
          {editing ? (
            <NumberField
              label="Classe Armatura"
              value={character.armorClass}
              onCommit={(value) => dispatch({ type: "setStat", stat: "armorClass", value })}
            />
          ) : (
            <CountUp value={character.armorClass} />
          )}
        </QuickStat>
      </div>
    </header>
  )
}
