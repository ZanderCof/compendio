"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  { title: "Accedi con Google", description: "Nessuna password da ricordare: un tocco e sei dentro." },
  { title: "Crea o unisciti a una campagna", description: "Il master la apre e manda il link; gli amici entrano con un tocco." },
  { title: "Crea il tuo personaggio", description: "PF, tiri salvezza e slot si calcolano da soli dalla classe e dal livello." },
  { title: "Gioca", description: "Avvia la sessione: scheda, dadi, mappa e chat, tutto sullo stesso schermo." },
]

/**
 * "Come funziona": la linea si disegna mentre scorri (ScrollTrigger con scrub)
 * e ogni numero si illumina quando entra nello schermo.
 */
export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = ref.current
    if (!list || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Senza animazioni: linea già disegnata e numeri già accesi
      list?.querySelectorAll("[data-step]").forEach((el) => el.setAttribute("data-lit", ""))
      return
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-line]",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: list, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
        }
      )
      gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top 65%",
          // Si accende scendendo, si spegne tornando su
          onEnter: () => step.setAttribute("data-lit", ""),
          onLeaveBack: () => step.removeAttribute("data-lit"),
        })
      })
    }, list)
    return () => ctx.revert()
  }, [])

  return (
    <ol ref={ref} className="relative mt-10 flex flex-col gap-10 pl-2">
      {/* Linea di fondo e linea che si disegna sopra */}
      <span aria-hidden className="absolute top-6 bottom-6 left-[1.6rem] w-0.5 rounded bg-border" />
      <span
        aria-hidden
        data-line
        className="absolute top-6 bottom-6 left-[1.6rem] w-0.5 origin-top rounded bg-linear-to-b from-plum via-violet to-aqua"
      />
      {STEPS.map((step, i) => (
        <li key={step.title} data-step className="group relative flex gap-5">
          <span
            className={
              "font-display relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-xl text-muted-foreground transition-all duration-500 " +
              "group-data-lit:border-primary group-data-lit:bg-primary group-data-lit:text-primary-foreground group-data-lit:shadow-[0_0_24px_rgba(170,62,152,0.55)]"
            }
          >
            {i + 1}
          </span>
          <div className="pt-1.5 transition-opacity duration-500 group-data-lit:opacity-100 md:opacity-60">
            <h3 className="text-2xl tracking-wide">{step.title}</h3>
            <p className="mt-1 text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
