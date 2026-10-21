"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export type SheetTab = {
  value: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

// Nome del parametro nell'URL: /characters/abc?sezione=incantesimi
const PARAM = "sezione"
// Larghezza della sfumatura ai bordi quando ci sono altri tab da scorrere
const FADE = "1.5rem"

/** Da quali lati la barra ha ancora tab nascosti (per mostrare la sfumatura solo lì). */
function useScrollEdges() {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [update])
  return { ref, edges, update }
}

/**
 * Barra di sezioni cliccabili: mostra una sezione alla volta.
 * La sezione aperta sta nell'URL, così sopravvive al ricaricamento e si può condividere.
 */
export function SheetTabs({ tabs }: { tabs: SheetTab[] }) {
  const searchParams = useSearchParams()
  const reducedMotion = useReducedMotion()
  const requested = searchParams.get(PARAM)
  // Una sezione che non esiste (es. "incantesimi" per un guerriero) apre la prima
  const current = tabs.some((tab) => tab.value === requested) ? requested! : tabs[0].value
  const { ref: scrollRef, edges, update } = useScrollEdges()
  const contentRef = useRef<HTMLDivElement>(null)

  // Il tab attivo resta sempre visibile nella barra (utile su telefono con molti tab)
  useEffect(() => {
    const active = scrollRef.current?.querySelector<HTMLElement>('[data-state="active"]')
    active?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reducedMotion ? "auto" : "smooth" })
  }, [current, scrollRef, reducedMotion])

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === tabs[0].value) params.delete(PARAM)
    else params.set(PARAM, value)
    const query = params.toString()
    // replace e non push: il tasto "indietro" esce dalla scheda invece di scorrere le sezioni
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname)
    // Se si era scesi nella pagina, la nuova sezione parte dall'inizio, subito sotto la barra
    const top = contentRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) contentRef.current?.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" })
  }

  const mask =
    edges.left || edges.right
      ? `linear-gradient(to right, ${edges.left ? "transparent" : "black"}, black ${FADE}, black calc(100% - ${FADE}), ${edges.right ? "transparent" : "black"})`
      : undefined

  return (
    <Tabs value={current} onValueChange={select} className="gap-4">
      {/* Sfondo pieno (con sfocatura) e bordo: le card sotto non si vedono più attraverso la barra */}
      <div className="sticky top-[calc(var(--nav-h)+0.5rem)] z-20 rounded-xl border bg-card/95 shadow-sm backdrop-blur-md">
        <div
          ref={scrollRef}
          onScroll={update}
          className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          <TabsList className="h-auto! w-max min-w-full justify-start gap-1 bg-transparent! p-1.5 pr-3">
            {tabs.map((tab) => {
              const active = tab.value === current
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "relative z-0 h-10 flex-none gap-1.5 rounded-lg px-3.5 tracking-wide data-active:bg-transparent! data-active:shadow-none",
                    active ? "text-primary-foreground!" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Indicatore del tab attivo: scorre da un tab all'altro */}
                  {active && (
                    <motion.span
                      layoutId="sheet-tab-active"
                      className="absolute inset-0 -z-10 rounded-lg bg-primary"
                      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 36 }}
                    />
                  )}
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
      </div>

      {/* La sezione scorre fino a sotto la barra fissata (scroll-margin) */}
      <div ref={contentRef} className="scroll-mt-[calc(var(--nav-h)+5rem)]">
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="flex flex-col gap-4">
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  )
}
