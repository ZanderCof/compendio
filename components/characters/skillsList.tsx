"use client"

import { RollButton } from "@/components/dice/rollButton"
import { useCharacter } from "./characterProvider"
import { ProficiencyDot } from "./proficiencyDot"
import { SheetSection } from "./sheetSection"
import { SKILLS, abilityLabel, signed, skillBonus } from "@/features/characters/rules"

export function SkillsList() {
  const { character, dispatch, editing } = useCharacter()

  return (
    <SheetSection
      title="Abilità"
      action={
        editing && (
          <span className="text-xs text-muted-foreground">Tocca il pallino per la competenza</span>
        )
      }
    >
      <ul className="flex flex-col">
        {SKILLS.map((skill) => {
          const bonus = skillBonus(character, skill.key, skill.ability)
          return (
            <li
              key={skill.key}
              className="flex items-center gap-2 border-b border-border/60 last:border-0"
            >
              <ProficiencyDot
                value={character.skills[skill.key] ?? "none"}
                editing={editing}
                label={skill.label}
                onClick={() => dispatch({ type: "cycleSkill", skill: skill.key })}
              />
              <RollButton
                label={skill.label}
                bonus={bonus}
                className="flex flex-1 items-center gap-2 py-1.5 pr-1 text-left"
              >
                <span className="w-8 shrink-0 text-right tabular-nums">{signed(bonus)}</span>
                <span className="flex-1">{skill.label}</span>
                <span className="text-xs text-muted-foreground">{abilityLabel(skill.ability)}</span>
              </RollButton>
            </li>
          )
        })}
      </ul>
    </SheetSection>
  )
}
