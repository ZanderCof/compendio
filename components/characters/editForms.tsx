"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ABILITIES } from "@/features/characters/rules"
import type { Ability } from "@/features/characters/types"
import { parse } from "@/features/dice/dice"
import { useCharacter } from "./characterProvider"

// Form compatti per aggiungere voci alle liste della scheda (modalità modifica).

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

export function AddAttackForm() {
  const { dispatch } = useCharacter()
  const [name, setName] = useState("")
  const [ability, setAbility] = useState<Ability>("str")
  const [proficient, setProficient] = useState(true)
  const [damage, setDamage] = useState("1d6")
  const [damageType, setDamageType] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-[2fr_auto_1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        try {
          parse(damage)
        } catch {
          setError(`Danni non validi: "${damage}". Esempio: 1d8 oppure 2d6`)
          return
        }
        dispatch({
          type: "addAttack",
          attack: { name, ability, proficient, damage: damage.trim(), damageType: damageType.trim() },
        })
        setName("")
        setDamageType("")
        setError(null)
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Arma o attacco" aria-label="Nome dell'attacco" />
      <select value={ability} onChange={(e) => setAbility(e.target.value as Ability)} className={selectClass} aria-label="Caratteristica">
        {ABILITIES.map((a) => (
          <option key={a.key} value={a.key}>
            {a.short}
          </option>
        ))}
      </select>
      <Input value={damage} onChange={(e) => setDamage(e.target.value)} placeholder="1d8" aria-label="Dadi del danno" />
      <Input value={damageType} onChange={(e) => setDamageType(e.target.value)} placeholder="tagliente" aria-label="Tipo di danno" />
      <Button type="submit" disabled={!name.trim()}>
        <Plus />
        Aggiungi
      </Button>
      <label className="flex items-center gap-2 text-sm sm:col-span-5">
        <input type="checkbox" checked={proficient} onChange={(e) => setProficient(e.target.checked)} className="accent-primary" />
        Competente (aggiunge il bonus di competenza al tiro per colpire)
      </label>
      {error && <p className="text-sm text-destructive sm:col-span-5">{error}</p>}
    </form>
  )
}

export function AddSpellForm() {
  const { dispatch } = useCharacter()
  const [name, setName] = useState("")
  const [level, setLevel] = useState(0)

  return (
    <form
      className="mt-4 flex flex-wrap gap-2 rounded-lg border border-dashed p-3"
      onSubmit={(e) => {
        e.preventDefault()
        dispatch({ type: "addSpell", spell: { name, level, prepared: level > 0 ? true : undefined } })
        setName("")
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome dell'incantesimo"
        aria-label="Nome dell'incantesimo"
        className="min-w-40 flex-1"
      />
      <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className={selectClass} aria-label="Livello">
        {Array.from({ length: 10 }, (_, i) => (
          <option key={i} value={i}>
            {i === 0 ? "Trucchetto" : `Livello ${i}`}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={!name.trim()}>
        <Plus />
        Aggiungi
      </Button>
    </form>
  )
}

export function AddFeatureForm() {
  const { dispatch } = useCharacter()
  const [name, setName] = useState("")
  const [source, setSource] = useState("Classe")
  const [description, setDescription] = useState("")

  return (
    <form
      className="mt-4 grid grid-cols-1 gap-2 rounded-lg border border-dashed p-3"
      onSubmit={(e) => {
        e.preventDefault()
        dispatch({ type: "addFeature", feature: { name, source: source.trim(), description: description.trim() } })
        setName("")
        setDescription("")
      }}
    >
      <div className="flex flex-wrap gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome del privilegio" aria-label="Nome del privilegio" className="min-w-40 flex-1" />
        <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass} aria-label="Origine">
          {["Razza", "Classe", "Sottoclasse", "Background", "Talento", "Oggetto", "Altro"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Cosa fa"
        aria-label="Descrizione del privilegio"
        rows={2}
        className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button type="submit" disabled={!name.trim()} className="justify-self-end">
        <Plus />
        Aggiungi
      </Button>
    </form>
  )
}
