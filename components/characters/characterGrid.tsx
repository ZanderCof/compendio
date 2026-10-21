"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Plus } from "lucide-react"

import { CharacterCard } from "@/components/characters/characterCard"
import type { CharacterSummary } from "@/features/characters/queries"
import { classTone } from "@/features/characters/look"
import { cn } from "@/lib/utils"

type Sort = "recent" | "name" | "level"

const SORTS: { id: Sort; label: string }[] = [
  { id: "recent", label: "Recenti" },
  { id: "name", label: "Nome" },
  { id: "level", label: "Livello" },
]

/** Una riga di chip: quella attiva ha uno sfondo che scorre da una all'altra. */
function ChipGroup<T extends string>({
  label,
  id,
  value,
  options,
  onChange,
}: {
  label: string
  id: string
  value: T
  options: { id: T; label: string; dot?: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      <span className="mr-1 text-xs tracking-widest text-muted-foreground uppercase">{label}</span>
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active ? "border-transparent text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`chip-${id}`}
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {option.dot && <span className={cn("relative size-2 rounded-full", option.dot)} />}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Personaggi in griglia con filtri per classe e campagna, ordinamento e card "Crea" in coda. */
export function CharacterGrid({ characters }: { characters: CharacterSummary[] }) {
  const reduced = useReducedMotion()
  const [classFilter, setClassFilter] = useState("all")
  const [campaignFilter, setCampaignFilter] = useState("all")
  const [sort, setSort] = useState<Sort>("recent")

  const classes = useMemo(() => [...new Set(characters.map((c) => c.className))].sort(), [characters])
  const campaigns = useMemo(() => {
    const byId = new Map<string, string>()
    for (const c of characters) if (c.campaign) byId.set(c.campaign.id, c.campaign.name)
    return [...byId].map(([id, name]) => ({ id, name }))
  }, [characters])
  const hasLoners = characters.some((c) => !c.campaign)

  const visible = useMemo(() => {
    const filtered = characters.filter(
      (c) =>
        (classFilter === "all" || c.className === classFilter) &&
        (campaignFilter === "all" || (campaignFilter === "none" ? !c.campaign : c.campaign?.id === campaignFilter))
    )
    // "recent" mantiene l'ordine del server (ultima modifica in alto)
    if (sort === "name") return filtered.toSorted((a, b) => a.name.localeCompare(b.name, "it"))
    if (sort === "level") return filtered.toSorted((a, b) => b.level - a.level || a.name.localeCompare(b.name, "it"))
    return filtered
  }, [characters, classFilter, campaignFilter, sort])

  // I filtri servono solo se c'è davvero qualcosa da scegliere
  const showClassFilter = classes.length > 1
  const showCampaignFilter = campaigns.length + (hasLoners ? 1 : 0) > 1
  const showSort = characters.length > 1

  return (
    <div className="flex flex-col gap-5">
      {(showClassFilter || showCampaignFilter || showSort) && (
        <div className="flex flex-col gap-2.5 rounded-2xl border bg-card/60 p-3">
          {showClassFilter && (
            <ChipGroup
              label="Classe"
              id="class"
              value={classFilter}
              onChange={setClassFilter}
              options={[
                { id: "all", label: "Tutte" },
                ...classes.map((name) => ({ id: name, label: name, dot: classTone(name).bg })),
              ]}
            />
          )}
          {showCampaignFilter && (
            <ChipGroup
              label="Campagna"
              id="campaign"
              value={campaignFilter}
              onChange={setCampaignFilter}
              options={[
                { id: "all", label: "Tutte" },
                ...campaigns.map((c) => ({ id: c.id, label: c.name })),
                ...(hasLoners ? [{ id: "none", label: "Senza campagna" }] : []),
              ]}
            />
          )}
          {showSort && <ChipGroup label="Ordina" id="sort" value={sort} onChange={setSort} options={SORTS} />}
        </div>
      )}

      <motion.ul layout={!reduced} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((character, i) => (
            <motion.li
              key={character.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: reduced ? 0 : Math.min(i, 8) * 0.03 }}
            >
              <CharacterCard character={character} href={`/characters/${character.id}`} />
            </motion.li>
          ))}
          {/* In coda: con pochi personaggi la pagina non sembra vuota */}
          <motion.li key="new" layout={!reduced}>
            <Link
              href="/characters/new"
              className="group flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-11 items-center justify-center rounded-full border-2 border-dashed border-current transition-transform duration-300 group-hover:rotate-90">
                <Plus className="size-5" />
              </span>
              <span className="font-display text-xl tracking-wide">Crea personaggio</span>
            </Link>
          </motion.li>
        </AnimatePresence>
      </motion.ul>

      {visible.length === 0 && (
        <p className="text-center text-muted-foreground">
          Nessun personaggio con questi filtri.{" "}
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setClassFilter("all")
              setCampaignFilter("all")
            }}
          >
            Mostra tutti
          </button>
        </p>
      )}
    </div>
  )
}
