"use client"

import { useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Minus, Plus, Skull } from "lucide-react"

import { CountUp } from "@/components/effects/countUp"
import { hpPercent, hpTone, type HpTone } from "@/features/characters/look"
import { cn } from "@/lib/utils"
import { useCharacter } from "./characterProvider"
import { HpEditor } from "./hpEditor"

const STROKE: Record<HpTone, string> = {
  healthy: "stroke-emerald-500",
  wounded: "stroke-amber-500",
  critical: "stroke-red-500",
  down: "stroke-destructive",
}

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Pallini dei tiri contro la morte, solo da vedere: si segnano nella sezione Salute. */
function DeathSavesMini({ successes, failures }: { successes: number; failures: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[0.65rem]" title="Tiri contro la morte (si tirano in Salute)">
      <Skull className="size-3 text-destructive" />
      {[0, 1, 2].map((i) => (
        <span key={`s${i}`} className={cn("size-2 rounded-full border border-aqua", i < successes && "bg-aqua")} />
      ))}
      <span className="w-1" />
      {[0, 1, 2].map((i) => (
        <span key={`f${i}`} className={cn("size-2 rounded-full border border-destructive", i < failures && "bg-destructive")} />
      ))}
    </div>
  )
}

/**
 * Punti ferita come anello: si accorcia con i danni e cambia colore (verde, ambra, rosso).
 * I PF temporanei sono un arco viola all'esterno. A ogni cambio l'anello lampeggia rosso o verde.
 * Toccandolo si apre il popup di danni e cure; − e + tolgono o aggiungono 1 PF.
 */
export function HpRing() {
  const { character, dispatch, readOnly } = useCharacter()
  const reduced = useReducedMotion()
  const { current, max, temp } = character.hitPoints
  const tone = hpTone(current, max)
  const percent = hpPercent(current, max)
  const tempPercent = Math.min(100, Math.round((temp / max) * 100))

  // Lampo quando i PF cambiano: confronto col valore precedente durante il render (niente effetti)
  const [previous, setPrevious] = useState(current)
  const [flash, setFlash] = useState<{ kind: "damage" | "heal"; key: number } | null>(null)
  if (current !== previous) {
    setPrevious(current)
    setFlash({ kind: current < previous ? "damage" : "heal", key: (flash?.key ?? 0) + 1 })
  }

  const ring = (
    <button
      type="button"
      aria-label={`Punti ferita ${current} su ${max}${temp > 0 ? `, più ${temp} temporanei` : ""}. Tocca per danni e cure`}
      className="relative size-24 shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {flash && !reduced && (
        <motion.span
          key={flash.key}
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full",
            flash.kind === "damage" ? "bg-red-500/40 shadow-[0_0_24px_4px] shadow-red-500/50" : "bg-emerald-500/35 shadow-[0_0_24px_4px] shadow-emerald-500/50"
          )}
          initial={{ opacity: 1, scale: 1.05 }}
          animate={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      )}
      <svg viewBox="0 0 100 100" className="relative size-full -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} className="fill-card stroke-muted" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={cn("transition-colors duration-500", STROKE[tone])}
          strokeDasharray={CIRCUMFERENCE}
          initial={reduced ? false : { strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - percent / 100) }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {temp > 0 && (
          <motion.circle
            cx="50"
            cy="50"
            r="48.5"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-violet"
            strokeDasharray={2 * Math.PI * 48.5}
            initial={reduced ? false : { strokeDashoffset: 2 * Math.PI * 48.5 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 48.5 * (1 - tempPercent / 100) }}
            transition={{ duration: 0.8 }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display text-3xl tabular-nums">
          <CountUp value={current} duration={0.6} />
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">/{max}</span>
        {temp > 0 && <span className="mt-0.5 text-[0.65rem] text-violet tabular-nums">+{temp} temp</span>}
      </span>
    </button>
  )

  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-1 sm:w-auto">
      <div className="flex items-center gap-1.5">
        {!readOnly && (
          <button
            type="button"
            onClick={() => dispatch({ type: "damage", amount: 1 })}
            aria-label="Togli 1 punto ferita"
            className="flex size-8 items-center justify-center rounded-full border bg-card text-red-600 transition-colors hover:bg-red-500/10 active:scale-95 dark:text-red-400"
          >
            <Minus className="size-4" />
          </button>
        )}
        {readOnly ? <span className="pointer-events-none">{ring}</span> : <HpEditor>{ring}</HpEditor>}
        {!readOnly && (
          <button
            type="button"
            onClick={() => dispatch({ type: "heal", amount: 1 })}
            disabled={current >= max}
            aria-label="Aggiungi 1 punto ferita"
            className="flex size-8 items-center justify-center rounded-full border bg-card text-emerald-600 transition-colors hover:bg-emerald-500/10 active:scale-95 disabled:opacity-40 dark:text-emerald-400"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>
      {current === 0 ? (
        <DeathSavesMini successes={character.deathSaves.successes} failures={character.deathSaves.failures} />
      ) : (
        <span className="text-xs tracking-widest text-muted-foreground">Punti ferita</span>
      )}
    </div>
  )
}
