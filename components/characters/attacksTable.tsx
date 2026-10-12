"use client"

import { toast } from "sonner"

import { RollButton } from "@/components/dice/rollButton"
import { useCharacter } from "./characterProvider"
import { SheetSection } from "./sheetSection"
import { abilityModifier, attackBonus, signed } from "@/features/characters/rules"
import { parse, type Dice } from "@/features/dice/dice"

/** Dadi del danno con il modificatore aggiunto, oppure null se la notazione non è valida. */
function damageDice(damage: string, modifier: number): Dice | null {
  try {
    const dice = parse(damage)
    return { ...dice, modifier: dice.modifier + modifier }
  } catch {
    return null
  }
}

export function AttacksTable() {
  const { character } = useCharacter()

  return (
    <SheetSection title="Attacchi">
      <p className="mb-2 text-xs text-muted-foreground">
        Tocca il bonus per tirare per colpire, i danni per tirare i danni.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-widest text-muted-foreground">
            <tr className="border-b">
              <th className="py-1 pr-3 font-normal">Nome</th>
              <th className="py-1 pr-3 font-normal">Colpire</th>
              <th className="py-1 pr-3 font-normal">Danni</th>
              <th className="py-1 font-normal">Note</th>
            </tr>
          </thead>
          <tbody>
            {character.attacks.map((attack) => {
              const damageMod = abilityModifier(character.abilities[attack.ability])
              const toHit = attackBonus(character, attack.ability, attack.proficient)
              const dice = damageDice(attack.damage, damageMod)
              const damageLabel = (
                <>
                  {attack.damage}
                  {damageMod !== 0 && signed(damageMod)}{" "}
                  <span className="text-muted-foreground">{attack.damageType}</span>
                </>
              )

              return (
                <tr key={attack.name} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-3">{attack.name}</td>
                  <td className="py-1 pr-3">
                    <RollButton
                      label={`${attack.name}: per colpire`}
                      bonus={toHit}
                      className="min-w-10 border bg-card px-2 py-0.5 tabular-nums"
                    >
                      {signed(toHit)}
                    </RollButton>
                  </td>
                  <td className="py-1 pr-3">
                    {dice ? (
                      <RollButton
                        label={`${attack.name}: danni`}
                        dice={dice}
                        className="border bg-card px-2 py-0.5 text-left"
                      >
                        {damageLabel}
                      </RollButton>
                    ) : (
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => toast.error(`Danni non validi: "${attack.damage}"`)}
                      >
                        {damageLabel}
                      </button>
                    )}
                  </td>
                  <td className="py-1.5 text-muted-foreground">{attack.notes ?? "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SheetSection>
  )
}
