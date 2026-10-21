"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  BookOpen,
  Dices,
  Map as MapIcon,
  Radio,
  ScrollText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

gsap.registerPlugin(ScrollTrigger)

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  /** Colore dell'icona e del riflettore */
  tone: "plum" | "violet" | "periwinkle" | "sky" | "aqua"
  /** Posizione nella griglia a 4 colonne (desktop) */
  span: string
}

const FEATURES: Feature[] = [
  {
    icon: ScrollText,
    title: "Scheda sempre sottomano",
    description:
      "Caratteristiche, abilità, incantesimi, capacità e inventario divisi in sezioni. Si salva da sola e si legge bene anche dal telefono, al tavolo.",
    tone: "plum",
    span: "sm:col-span-2 lg:row-span-2",
  },
  {
    icon: Dices,
    title: "Dadi con un tocco",
    description: "Tocchi un'abilità o un attacco e il tiro parte, con vantaggio e svantaggio.",
    tone: "violet",
    span: "",
  },
  {
    icon: Radio,
    title: "Sessione dal vivo",
    description: "I tiri compaiono a tutto il tavolo in un attimo. Il master può tirare di nascosto.",
    tone: "aqua",
    span: "",
  },
  {
    icon: MapIcon,
    title: "Mappa di gioco",
    description: "Il master carica la mappa, calibra la griglia e disegna muri, porte e terreno difficile.",
    tone: "sky",
    span: "sm:col-span-2",
  },
  {
    icon: Users,
    title: "Master e giocatori",
    description: "Inviti con un link o per email, chat del gruppo e chi è online.",
    tone: "periwinkle",
    span: "",
  },
  {
    icon: BookOpen,
    title: "Diario e date",
    description: "Note di sessione, PNG e luoghi. Un sondaggio per decidere quando giocare.",
    tone: "violet",
    span: "",
  },
  {
    icon: ShieldCheck,
    title: "Modifiche con permesso",
    description: "Il master propone modifiche alle schede, ma è il giocatore ad accettarle o rifiutarle.",
    tone: "plum",
    span: "sm:col-span-2",
  },
]

const TONES = {
  plum: { icon: "bg-plum/15 text-plum", spot: "170, 62, 152" },
  violet: { icon: "bg-violet/15 text-violet", spot: "147, 104, 183" },
  periwinkle: { icon: "bg-periwinkle/20 text-periwinkle", spot: "146, 151, 196" },
  sky: { icon: "bg-sky/20 text-sky", spot: "132, 199, 208" },
  aqua: { icon: "bg-aqua/20 text-aqua", spot: "117, 221, 221" },
} as const

/** Card con riflettore (SpotlightCard di React Bits): un alone colorato segue il cursore. */
function SpotlightCard({ feature, big }: { feature: Feature; big: boolean }) {
  const tone = TONES[feature.tone]
  return (
    <article
      data-bento-card
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`)
        e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`)
      }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40",
        feature.span
      )}
      style={{ "--spot-color": tone.spot } as React.CSSProperties}
    >
      {/* Il riflettore: visibile solo al passaggio del mouse */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(360px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(var(--spot-color), 0.16), transparent 70%)",
        }}
      />
      <div
        className={cn(
          "relative flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6",
          tone.icon
        )}
      >
        <feature.icon className="size-6" />
      </div>
      <h3 className={cn("relative mt-5 tracking-wide", big ? "text-3xl" : "text-xl")}>{feature.title}</h3>
      <p className="relative mt-2 text-muted-foreground">{feature.description}</p>

      {/* Nella card grande: un'anteprima della scheda, decorativa */}
      {big && (
        <div aria-hidden className="relative mt-auto grid grid-cols-3 gap-2 pt-6">
          {[
            ["FOR", "+2"],
            ["DES", "+3"],
            ["SAG", "+4"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border-2 border-violet/30 bg-secondary/50 p-3 text-center">
              <p className="mx-auto text-xs tracking-widest text-muted-foreground">{label}</p>
              <p className="font-display text-3xl">{value}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

/** "Cosa puoi fare": griglia bento con le card che entrano una dopo l'altra mentre la sezione arriva. */
export function FeatureBento() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const grid = ref.current
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      gsap.from("[data-bento-card]", {
        opacity: 0,
        y: 32,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: grid, start: "top 80%", once: true },
      })
    }, grid)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((feature, i) => (
        <SpotlightCard key={feature.title} feature={feature} big={i === 0} />
      ))}
    </div>
  )
}
