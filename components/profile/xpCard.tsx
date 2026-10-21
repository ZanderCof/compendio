"use client"

import { motion, useReducedMotion } from "motion/react"
import { Sparkles } from "lucide-react"

import { CountUp } from "@/components/effects/countUp"
import type { XpProgress } from "@/features/profile/xp"

const SOURCES = ["Creare personaggi e campagne", "Invitare amici", "Completare missioni", "Accedere ogni giorno"]

/** Livello del profilo: medaglione con il numero e barra dell'EXP che si riempie all'apertura. */
export function XpCard({ progress }: { progress: XpProgress }) {
  const reduced = useReducedMotion()

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-linear-to-br from-plum/25 via-violet/20 to-aqua/25 blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-plum to-violet text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20">
          <span className="font-display text-3xl leading-none tabular-nums">
            <CountUp value={progress.level} duration={0.6} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Livello del profilo</p>
          <h2 className="text-3xl leading-tight tracking-wide">Livello {progress.level}</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            <CountUp value={progress.xp} /> EXP in tutto
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <div
          className="h-3 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Esperienza verso il prossimo livello"
          aria-valuemin={0}
          aria-valuemax={progress.levelSize}
          aria-valuenow={progress.intoLevel}
        >
          <motion.div
            className="relative h-full rounded-full bg-linear-to-r from-plum via-violet to-aqua"
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${Math.max(progress.percent, progress.intoLevel > 0 ? 2 : 0)}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>
            {progress.intoLevel}/{progress.levelSize} EXP
          </span>
          <span>
            Mancano {progress.toNext} al livello {progress.level + 1}
          </span>
        </div>
      </div>

      <div className="relative mt-4 rounded-xl bg-secondary/40 p-3">
        <p className="flex items-center gap-1.5 text-sm">
          <Sparkles className="size-4 text-violet" />
          Presto guadagnerai EXP con:
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {SOURCES.map((source) => (
            <li key={source} className="rounded-full border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
              {source}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
