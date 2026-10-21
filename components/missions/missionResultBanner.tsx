"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Coins, Gem, PartyPopper, Sparkles, X } from "lucide-react"

import { D20 } from "@/components/brand/d20"
import { CountUp } from "@/components/effects/countUp"
import { burstFromElement } from "@/components/effects/sparks"
import { Button } from "@/components/ui/button"
import { collectMissionResults, markMissionResultsSeen, type MissionResult } from "@/features/missions/actions"
import { cn } from "@/lib/utils"
import { TierBadge } from "./tierBadge"

// Ogni quanto chiedere al server se qualche personaggio è tornato
const INTERVAL_MS = 60_000

type Pending = { results: MissionResult[]; levelBefore: number; levelAfter: number }

/**
 * Banner dei risultati delle missioni: compare quando un personaggio torna, uno alla volta.
 * Missione riuscita: scintille e ricompense; fallita: metà EXP. Alla fine l'eventuale nuovo livello.
 */
export function MissionResultBanner() {
  const reduced = useReducedMotion()
  const [pending, setPending] = useState<Pending | null>(null)
  const [index, setIndex] = useState(0)
  const [closing, startClosing] = useTransition()
  const cardRef = useRef<HTMLDivElement>(null)
  // Mentre un banner è aperto non si chiede altro al server
  const showing = useRef(false)

  const check = useCallback(async () => {
    if (showing.current || document.visibilityState !== "visible") return
    try {
      const data = await collectMissionResults()
      if (data.results.length > 0) {
        showing.current = true
        setIndex(0)
        setPending(data)
      }
    } catch {
      // Rete assente o sessione scaduta: si riprova al prossimo giro
    }
  }, [])

  useEffect(() => {
    // Primo controllo appena il browser è libero, poi a intervalli e quando si torna sulla scheda
    const first = setTimeout(check, 1500)
    const timer = setInterval(check, INTERVAL_MS)
    document.addEventListener("visibilitychange", check)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener("visibilitychange", check)
    }
  }, [check])

  const result = pending?.results[index]

  // Scintille quando compare una missione riuscita
  useEffect(() => {
    if (!result?.success || !cardRef.current) return
    const target = cardRef.current
    // Il diamante merita una doppia esplosione
    const bursts = result.tier === "DIAMOND" ? [450, 900] : [450]
    const timers = bursts.map((delay) => setTimeout(() => burstFromElement(target, "crit"), delay))
    return () => timers.forEach(clearTimeout)
  }, [result])

  if (!pending) return null
  const isLast = index === pending.results.length - 1
  const levelUp = isLast && pending.levelAfter > pending.levelBefore

  function next() {
    if (!pending) return
    if (!isLast) {
      setIndex((i) => i + 1)
      return
    }
    const ids = pending.results.map((r) => r.id)
    startClosing(async () => {
      await markMissionResultsSeen(ids).catch(() => {})
      showing.current = false
      setPending(null)
    })
  }

  // Portal nel body: l'header ha backdrop-blur, che farebbe posizionare il banner dentro di lui
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--nav-h)+0.75rem)] z-50 flex justify-center px-4">
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.id}
            ref={cardRef}
            role="alertdialog"
            aria-labelledby={`mission-${result.id}`}
            initial={reduced ? false : { opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className={cn(
              "pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border-2 bg-card shadow-2xl",
              result.success ? "border-aqua shadow-aqua/20" : "border-border",
              result.success && result.tier === "DIAMOND" && "border-glow"
            )}
          >
            {/* Fascia colorata in alto */}
            <div
              className={cn(
                "h-1.5",
                result.success ? "banner-animated" : "bg-linear-to-r from-muted-foreground/40 to-muted-foreground/20"
              )}
            />
            <button
              type="button"
              onClick={next}
              aria-label="Chiudi"
              className="absolute top-3 right-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="flex gap-4 p-4 pr-10">
              <D20
                value={result.natural}
                motion="toss"
                className={cn("size-16 shrink-0", !result.success && "grayscale")}
              />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xs tracking-widest text-muted-foreground uppercase">
                  <TierBadge tier={result.tier} />
                  {pending.results.length > 1 && `${index + 1} di ${pending.results.length}`}
                </p>
                <h2
                  id={`mission-${result.id}`}
                  className={cn("text-3xl leading-tight tracking-wide", result.success && "text-shiny")}
                >
                  {result.success ? "Missione compiuta!" : "Missione fallita"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {result.characterName} è tornato da «{result.missionTitle}». Prova: {result.total} contro CD{" "}
                  {result.dc}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-4 pb-3">
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
                <Sparkles className="size-4" />
                <span className="font-display text-xl leading-none">
                  +<CountUp value={result.xpAwarded} /> EXP
                </span>
              </span>
              {result.rewardItem && (
                <span className="flex items-center gap-1 rounded-full bg-aqua/20 px-3 py-1 text-sm">
                  <Gem className="size-4" />
                  {result.rewardItem}
                </span>
              )}
              {result.rewardGold > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-sm">
                  <Coins className="size-4" />
                  {result.rewardGold} mo
                </span>
              )}
              {!result.success && <span className="self-center text-xs text-muted-foreground">Metà EXP, niente bottino</span>}
            </div>

            {levelUp && (
              <motion.p
                initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-linear-to-r from-plum to-violet px-3 py-2 text-primary-foreground"
              >
                <PartyPopper className="size-5" />
                <span className="font-display text-xl tracking-wide">Livello {pending.levelAfter} raggiunto!</span>
              </motion.p>
            )}

            <div className="flex justify-end border-t bg-muted/30 px-4 py-2.5">
              <Button size="sm" onClick={next} disabled={closing}>
                {isLast ? "Fantastico" : "Avanti"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  )
}
