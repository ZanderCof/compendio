"use client"

import dynamic from "next/dynamic"

import { D20 } from "@/components/brand/d20"

// WebGL solo nel browser: niente rendering sul server per lo sfondo
const Aurora = dynamic(() => import("./aurora").then((m) => m.Aurora), { ssr: false })

/** Sfondo della hero: aurora tenue con i colori della palette. */
export function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-35 dark:opacity-45">
      <Aurora />
      {/* Sfuma verso il fondo della pagina: l'aurora non "taglia" la sezione sotto */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-background" />
    </div>
  )
}

/** Il d20 grande della hero: ruota lentamente su un alone colorato. */
export function HeroDie() {
  return (
    <div className="relative flex items-center justify-center">
      <div
        aria-hidden
        className="absolute size-64 rounded-full bg-linear-to-br from-plum/40 via-violet/30 to-aqua/30 blur-3xl md:size-80"
      />
      <D20 value={20} motion="spin" className="relative size-56 md:size-72 lg:size-80" />
    </div>
  )
}
