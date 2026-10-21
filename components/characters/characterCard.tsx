"use client"

import Link from "next/link"
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react"
import { Crown, Gauge, Heart, Shield, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { CharacterSummary } from "@/features/characters/queries"
import { classTone, hpPercent, hpTone, type HpTone } from "@/features/characters/look"
import { signed } from "@/features/characters/rules"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

const HP_BAR: Record<HpTone, string> = {
  healthy: "bg-emerald-500",
  wounded: "bg-amber-500",
  critical: "bg-red-500",
  down: "bg-destructive",
}

const HP_ICON: Record<HpTone, string> = {
  healthy: "text-emerald-600 dark:text-emerald-400",
  wounded: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
  down: "text-destructive",
}

/** Inclinazione massima della card (gradi) quando il mouse ci passa sopra */
const TILT = 5

/**
 * Riquadro di un personaggio nelle liste. Con `href` tutta la card porta alla scheda
 * (link "steso" sotto il contenuto), mentre il badge della campagna resta un link a sé.
 */
export function CharacterCard({
  character,
  href,
  showOwner = false,
}: {
  character: CharacterSummary
  href?: string
  showOwner?: boolean
}) {
  const reduced = useReducedMotion()
  const { hitPoints } = character
  const tone = hpTone(hitPoints.current, hitPoints.max)
  const percent = hpPercent(hitPoints.current, hitPoints.max)
  const classColor = classTone(character.className)

  // Inclinazione (TiltedCard di React Bits): solo col mouse e senza "riduci movimento"
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    e.currentTarget.style.setProperty("--spot-x", `${x * 100}%`)
    e.currentTarget.style.setProperty("--spot-y", `${y * 100}%`)
    if (reduced) return
    rotateY.set((x - 0.5) * 2 * TILT)
    rotateX.set((0.5 - y) * 2 * TILT)
  }

  function onPointerLeave() {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.article
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-4 transition-[border-color,box-shadow] duration-300",
        href && "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50"
      )}
    >
      {/* Riflettore che segue il mouse */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(320px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(147, 104, 183, 0.14), transparent 70%)",
        }}
      />
      {href && (
        <Link href={href} className="absolute inset-0 z-0 outline-none" aria-label={`Apri la scheda di ${character.name}`} />
      )}

      <div className="pointer-events-none relative flex items-center gap-3">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-plum to-violet text-lg text-primary-foreground ring-3 ring-offset-2 ring-offset-card",
            classColor.ring
          )}
        >
          {initials(character.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl leading-tight tracking-wide">{character.name}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {character.race} · <span className={classColor.text}>{character.className}</span> {character.level}
          </p>
        </div>
      </div>

      {/* PF: la barra si riempie all'apertura della pagina */}
      <div className="pointer-events-none relative mt-4 flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1" title="Punti ferita">
          <Heart className={cn("size-4", HP_ICON[tone])} />
          <span className="tabular-nums">
            {hitPoints.current}/{hitPoints.max}
          </span>
        </span>
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label="Punti ferita"
          aria-valuemin={0}
          aria-valuemax={hitPoints.max}
          aria-valuenow={hitPoints.current}
        >
          <motion.div
            className={cn("h-full rounded-full", HP_BAR[tone])}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          />
        </div>
      </div>

      {/* Anteprima rapida: sempre visibile su touch, al passaggio del mouse sugli schermi con hover */}
      <div className="pointer-events-none relative grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 [@media(hover:hover)]:grid-rows-[0fr] [@media(hover:hover)]:group-hover:grid-rows-[1fr] [@media(hover:hover)]:group-has-[a:focus-visible]:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "CA", value: character.armorClass, icon: Shield },
              { label: "Iniziativa", value: signed(character.initiative), icon: Gauge },
              { label: "Livello", value: character.level, icon: Sparkles },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg bg-secondary/50 px-2 py-1.5">
                <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Icon className="size-3" />
                  {label}
                </dt>
                <dd className="font-display text-xl leading-none">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {(showOwner || character.campaign || character.pendingRequests > 0) && (
        <div className="relative mt-auto flex flex-wrap gap-2 pt-3">
          {character.pendingRequests > 0 && (
            <Badge className="pointer-events-none">
              <Crown />
              {character.pendingRequests === 1
                ? "1 proposta del master"
                : `${character.pendingRequests} proposte del master`}
            </Badge>
          )}
          {showOwner && (
            <Badge variant="secondary" className="pointer-events-none">
              Giocatore: {character.ownerName}
            </Badge>
          )}
          {character.campaign && !showOwner && (
            <Badge variant="outline" asChild className="relative z-10 hover:border-primary hover:text-primary">
              <Link href={`/campaigns/${character.campaign.id}`}>{character.campaign.name}</Link>
            </Badge>
          )}
        </div>
      )}
    </motion.article>
  )
}
