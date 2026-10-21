"use client"

import { useEffect, useId, useRef } from "react"
import gsap from "gsap"

import { cn } from "@/lib/utils"

type D20Props = {
  /** Numero sulla faccia centrale */
  value?: string | number
  /**
   * spin: ruota lentamente e fluttua (home)
   * roll: rotola, rimbalza e si ferma (pagine 404 ed errore)
   * none: fermo
   */
  motion?: "spin" | "roll" | "none"
  className?: string
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Un d20 in SVG: icosaedro visto di fronte, facce con i colori della palette. */
export function D20({ value = 20, motion = "none", className }: D20Props) {
  const ref = useRef<SVGSVGElement>(null)
  const id = useId().replaceAll(":", "")

  useEffect(() => {
    const svg = ref.current
    if (!svg || motion === "none" || prefersReducedMotion()) return

    // gsap.context: alla chiusura del componente tutte le animazioni si fermano da sole
    const ctx = gsap.context(() => {
      if (motion === "spin") {
        gsap.to(svg, { rotation: 360, duration: 24, ease: "none", repeat: -1, transformOrigin: "50% 50%" })
        gsap.to(svg, { y: -10, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 })
      } else {
        gsap
          .timeline()
          .from(svg, {
            rotation: -720,
            scale: 0.4,
            y: -120,
            opacity: 0,
            duration: 1.1,
            ease: "power2.in",
            transformOrigin: "50% 50%",
          })
          .to(svg, { y: -24, duration: 0.22, ease: "power1.out" })
          .to(svg, { y: 0, duration: 0.5, ease: "bounce.out" })
          .to(svg, { rotation: 8, duration: 0.12, yoyo: true, repeat: 3, ease: "sine.inOut" })
      }
    }, svg)
    return () => ctx.revert()
  }, [motion])

  return (
    <svg ref={ref} viewBox="0 0 100 100" className={cn("drop-shadow-lg", className)} role="img" aria-label={`d20: ${value}`}>
      <defs>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--palette-plum)" />
          <stop offset="100%" stopColor="var(--palette-violet)" />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--palette-violet)" />
          <stop offset="100%" stopColor="var(--palette-periwinkle)" />
        </linearGradient>
      </defs>
      {/* Contorno esagonale */}
      <polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" fill={`url(#${id}-side)`} />
      {/* Facce laterali: più scure per dare profondità */}
      <g fill="rgba(0,0,0,0.18)">
        <polygon points="50,3 9,26.5 50,26" />
        <polygon points="91,73.5 50,97 74,66" />
        <polygon points="9,73.5 26,66 9,26.5" />
      </g>
      <g fill="rgba(255,255,255,0.12)">
        <polygon points="50,3 91,26.5 50,26" />
        <polygon points="91,26.5 91,73.5 74,66" />
        <polygon points="9,73.5 50,97 26,66" />
      </g>
      {/* Faccia centrale */}
      <polygon points="50,26 74,66 26,66" fill={`url(#${id}-face)`} />
      {/* Spigoli */}
      <g stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinejoin="round" fill="none">
        <polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" />
        <polygon points="50,26 74,66 26,66" />
        <path d="M50,26 L50,3 M50,26 L9,26.5 M50,26 L91,26.5 M74,66 L91,26.5 M74,66 L91,73.5 M74,66 L50,97 M26,66 L9,26.5 M26,66 L9,73.5 M26,66 L50,97" />
      </g>
      <text
        x="50"
        y="56"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={String(value).length > 1 ? 15 : 18}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </text>
    </svg>
  )
}
