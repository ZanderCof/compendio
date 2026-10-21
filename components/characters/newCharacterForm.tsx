"use client"

import { useState, useTransition } from "react"
import { Dices, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createCharacter } from "@/features/characters/actions"
import { CLASSES, findClass, maxHitPoints } from "@/features/characters/classes"
import { ABILITIES, SKILLS, abilityModifier, signed } from "@/features/characters/rules"
import type { Ability, Skill } from "@/features/characters/types"
import { parse, roll } from "@/features/dice/dice"
import { SheetSection } from "./sheetSection"

const RACES = ["Umano", "Elfo", "Mezzelfo", "Nano", "Halfling", "Gnomo", "Mezzorco", "Dragonide", "Tiefling"]
const ALIGNMENTS = [
  "Legale Buono", "Neutrale Buono", "Caotico Buono",
  "Legale Neutrale", "Neutrale", "Caotico Neutrale",
  "Legale Malvagio", "Neutrale Malvagio", "Caotico Malvagio",
]
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]
const CUSTOM_CLASS = "__custom"

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs tracking-widest text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

type CampaignOption = { id: string; name: string }

export function NewCharacterForm({
  campaigns,
  defaultCampaignId,
}: {
  campaigns: CampaignOption[]
  defaultCampaignId?: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [race, setRace] = useState("")
  const [classChoice, setClassChoice] = useState(CLASSES[0].name)
  const [customClass, setCustomClass] = useState("")
  const [subclass, setSubclass] = useState("")
  const [level, setLevel] = useState(1)
  const [background, setBackground] = useState("")
  const [alignment, setAlignment] = useState("")
  const [abilities, setAbilities] = useState<Record<Ability, number>>({
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  })
  const [skills, setSkills] = useState<Set<Skill>>(new Set())
  const [armorClass, setArmorClass] = useState("")
  const [speed, setSpeed] = useState(9)
  const [campaignId, setCampaignId] = useState(
    campaigns.some((c) => c.id === defaultCampaignId) ? defaultCampaignId! : ""
  )

  const className = classChoice === CUSTOM_CLASS ? customClass : classChoice
  const classInfo = findClass(className)
  const previewHp = maxHitPoints(classInfo?.hitDie ?? 8, level, abilityModifier(abilities.con))
  const previewAc = armorClass === "" ? 10 + abilityModifier(abilities.dex) : Number(armorClass)

  function rollAbilities() {
    // 4d6, si tiene il meglio di 3: per ogni caratteristica
    const dice = parse("4d6kh3")
    setAbilities(
      Object.fromEntries(ABILITIES.map((a) => [a.key, roll(dice).total])) as Record<Ability, number>
    )
  }

  function applyStandardArray() {
    setAbilities(
      Object.fromEntries(ABILITIES.map((a, i) => [a.key, STANDARD_ARRAY[i]])) as Record<Ability, number>
    )
  }

  function toggleSkill(skill: Skill) {
    setSkills((prev) => {
      const next = new Set(prev)
      if (next.has(skill)) next.delete(skill)
      else next.add(skill)
      return next
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createCharacter({
        name,
        race,
        className,
        subclass: subclass || undefined,
        level,
        background,
        alignment,
        abilities,
        skills: Object.fromEntries([...skills].map((s) => [s, "proficient"])),
        armorClass: armorClass === "" ? undefined : Number(armorClass),
        speed,
        campaignId: campaignId || undefined,
      })
      // Se va tutto bene l'azione apre la scheda: si arriva qui solo in caso di errore
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <SheetSection title="Chi è">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus />
          </Field>
          <Field label="Razza">
            <Input value={race} onChange={(e) => setRace(e.target.value)} list="races" required maxLength={60} />
            <datalist id="races">
              {RACES.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          <Field label="Classe">
            <select value={classChoice} onChange={(e) => setClassChoice(e.target.value)} className={fieldClass}>
              {CLASSES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value={CUSTOM_CLASS}>Altra…</option>
            </select>
          </Field>
          {classChoice === CUSTOM_CLASS ? (
            <Field label="Nome della classe">
              <Input value={customClass} onChange={(e) => setCustomClass(e.target.value)} required maxLength={60} />
            </Field>
          ) : (
            <Field label="Sottoclasse (facoltativa)">
              <Input value={subclass} onChange={(e) => setSubclass(e.target.value)} maxLength={60} />
            </Field>
          )}
          <Field label="Livello">
            <Input
              type="number"
              min={1}
              max={20}
              value={level}
              onChange={(e) => setLevel(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
            />
          </Field>
          <Field label="Background">
            <Input value={background} onChange={(e) => setBackground(e.target.value)} maxLength={60} placeholder="es. Accolito" />
          </Field>
          <Field label="Allineamento">
            <select value={alignment} onChange={(e) => setAlignment(e.target.value)} className={fieldClass}>
              <option value="">—</option>
              {ALIGNMENTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          {campaigns.length > 0 && (
            <Field label="Campagna">
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={fieldClass}>
                <option value="">Nessuna (per ora)</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </SheetSection>

      <SheetSection
        title="Caratteristiche"
        action={
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={applyStandardArray}>
              Serie standard
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={rollAbilities}>
              <Dices />
              Tira 4d6
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ABILITIES.map((ability) => (
            <label key={ability.key} className="flex flex-col items-center gap-1 rounded-xl border bg-secondary/40 p-2">
              <span className="text-xs tracking-widest">{ability.label}</span>
              <input
                type="number"
                min={1}
                max={30}
                value={abilities[ability.key]}
                onChange={(e) =>
                  setAbilities((prev) => ({
                    ...prev,
                    [ability.key]: Math.min(30, Math.max(1, Number(e.target.value) || 1)),
                  }))
                }
                className="w-14 rounded-md border bg-card text-center text-2xl tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <span className="text-sm text-muted-foreground">{signed(abilityModifier(abilities[ability.key]))}</span>
            </label>
          ))}
        </div>
      </SheetSection>

      <SheetSection title="Competenze nelle abilità">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {SKILLS.map((skill) => (
            <label key={skill.key} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted">
              <input
                type="checkbox"
                checked={skills.has(skill.key)}
                onChange={() => toggleSkill(skill.key)}
                className="accent-primary"
              />
              <span className="flex-1">{skill.label}</span>
              <span className="text-xs text-muted-foreground">
                {ABILITIES.find((a) => a.key === skill.ability)!.short}
              </span>
            </label>
          ))}
        </div>
      </SheetSection>

      <SheetSection title="Difesa e movimento">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Classe Armatura" hint="Vuoto = senza armatura (10 + Destrezza)">
            <Input
              type="number"
              min={0}
              max={40}
              value={armorClass}
              onChange={(e) => setArmorClass(e.target.value)}
              placeholder={String(10 + abilityModifier(abilities.dex))}
            />
          </Field>
          <Field label="Velocità (metri)">
            <Input type="number" min={0} max={60} value={speed} onChange={(e) => setSpeed(Number(e.target.value) || 0)} />
          </Field>
        </div>
      </SheetSection>

      {/* Anteprima di quello che si calcola da solo */}
      <div className="rounded-xl border bg-accent/50 p-4 text-sm">
        <p className="text-xs tracking-widest text-accent-foreground">Calcolato in automatico</p>
        <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <li>
            Punti ferita: <strong>{previewHp}</strong>
          </li>
          <li>
            Dadi vita: <strong>{level}d{classInfo?.hitDie ?? 8}</strong>
          </li>
          <li>
            Classe armatura: <strong>{previewAc}</strong>
          </li>
          <li>
            Tiri salvezza:{" "}
            <strong>
              {classInfo
                ? classInfo.savingThrows.map((a) => ABILITIES.find((x) => x.key === a)!.short).join(", ")
                : "da scegliere nella scheda"}
            </strong>
          </li>
          {classInfo?.caster && <li>Slot incantesimo in base al livello</li>}
        </ul>
        <p className="mt-2 text-muted-foreground">
          Attacchi, incantesimi, equipaggiamento e storia li aggiungi dalla scheda con “Modifica”.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className={cn("h-11 self-end px-6 text-base")}>
        {pending && <LoaderCircle className="animate-spin" />}
        Crea personaggio
      </Button>
    </form>
  )
}
