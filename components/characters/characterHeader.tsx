"use client"

import { Sparkle } from "lucide-react"

import { RollButton } from "@/components/dice/rollButton"
import { cn } from "@/lib/utils"
import { initiative, proficiencyBonus, signed } from "@/features/characters/rules"
import { useCharacter } from "./characterProvider"
import { HpEditor } from "./hpEditor"
import { NumberField } from "./numberField"

function QuickStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex h-8 items-center text-2xl leading-none">{children}</span>
      <span className="mt-1 text-center text-[0.65rem] tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function CharacterHeader() {
  const { character, dispatch, editing } = useCharacter()
  const { hitPoints } = character
  const initials = character.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* Avatar: per ora le iniziali, poi un'immagine */}
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-plum to-violet text-2xl text-primary-foreground ring-2 ring-primary/40">
          {initials}
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

        <HpEditor>
          <button
            type="button"
            aria-label="Modifica punti ferita"
            className={cn(
              "flex shrink-0 flex-col items-center rounded-lg bg-primary px-3 py-1.5 text-primary-foreground transition-transform hover:brightness-110 active:scale-[0.97]",
              hitPoints.current === 0 && "bg-destructive text-white"
            )}
          >
            <span className="text-xl leading-tight tabular-nums">
              {hitPoints.current}/{hitPoints.max}
            </span>
            <span className="text-[0.65rem] tracking-widest opacity-90">Punti Ferita</span>
            {hitPoints.temp > 0 && (
              <span className="text-[0.65rem] opacity-80">+{hitPoints.temp} temp</span>
            )}
          </button>
        </HpEditor>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-xl border bg-card px-2 py-3">
        <QuickStat label="Competenza">{signed(proficiencyBonus(character.level))}</QuickStat>
        <QuickStat label="Velocità">
          {editing ? (
            <NumberField
              label="Velocità"
              value={character.speed}
              onCommit={(value) => dispatch({ type: "setStat", stat: "speed", value })}
            />
          ) : (
            <>
              {character.speed}
              <span className="ml-0.5 text-xs text-muted-foreground">m</span>
            </>
          )}
        </QuickStat>
        <QuickStat label="Iniziativa">
          <RollButton label="Iniziativa" bonus={initiative(character)} className="px-2">
            {signed(initiative(character))}
          </RollButton>
        </QuickStat>
        <QuickStat label="Classe Armatura">
          {editing ? (
            <NumberField
              label="Classe Armatura"
              value={character.armorClass}
              onCommit={(value) => dispatch({ type: "setStat", stat: "armorClass", value })}
            />
          ) : (
            character.armorClass
          )}
        </QuickStat>
      </div>
    </header>
  )
}
