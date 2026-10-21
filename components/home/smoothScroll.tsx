"use client"

import { createContext, use, useEffect, useRef, type RefObject } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

// Un riferimento stabile: il link legge l'istanza solo al momento del clic
const LenisContext = createContext<RefObject<Lenis | null> | null>(null)

/**
 * Scroll fluido con Lenis, solo nella home (sul resto del sito, e sulla mappa, lo scroll resta nativo).
 * Lenis e ScrollTrigger avanzano insieme, così le animazioni legate allo scroll restano allineate.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenis = useRef<Lenis | null>(null)

  useEffect(() => {
    // Con "riduci movimento" lo scroll resta quello del sistema
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const instance = new Lenis({ duration: 1.1, smoothWheel: true })
    instance.on("scroll", ScrollTrigger.update)
    const tick = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    lenis.current = instance

    return () => {
      gsap.ticker.remove(tick)
      instance.destroy()
      lenis.current = null
    }
  }, [])

  return <LenisContext value={lenis}>{children}</LenisContext>
}

/** Link interno alla pagina (es. #come-funziona) con scroll fluido; senza Lenis usa quello del browser. */
export function ScrollLink({
  target,
  className,
  children,
}: {
  target: string
  className?: string
  children: React.ReactNode
}) {
  const lenisRef = use(LenisContext)

  return (
    <a
      href={target}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        const el = document.querySelector<HTMLElement>(target)
        if (!el) return
        // Si ferma sotto la navbar fissata
        const navHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 3.25
        const offset = -(navHeight * Number.parseFloat(getComputedStyle(document.documentElement).fontSize) + 16)
        const lenis = lenisRef?.current
        if (lenis) lenis.scrollTo(el, { offset, duration: 1.2 })
        else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" })
        history.replaceState(null, "", target)
      }}
    >
      {children}
    </a>
  )
}
