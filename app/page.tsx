import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

import { FeatureBento } from "@/components/home/featureBento"
import { HeroTitle } from "@/components/home/heroTitle"
import { HeroBackground, HeroDie } from "@/components/home/heroVisual"
import { HowItWorks } from "@/components/home/howItWorks"
import { Magnet } from "@/components/home/magnet"
import { ScrollLink, SmoothScroll } from "@/components/home/smoothScroll"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <SmoothScroll>
      <main className="flex flex-col">
        {/* Hero: testo a sinistra, d20 a destra (sotto su telefono) */}
        <section className="relative isolate overflow-hidden">
          <HeroBackground />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col items-start gap-6">
              <span className="flex items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1 text-xs tracking-widest text-violet backdrop-blur">
                <Sparkles className="size-3.5" />
                D&amp;D 5ª edizione
              </span>
              <HeroTitle text="Il compendio della tua campagna" highlight="campagna" />
              <p className="text-lg text-muted-foreground">
                Schede dei personaggi, dadi, mappa e campagne condivise. Tutto quello che serve al tuo gruppo, in un
                posto solo: dal telefono al tavolo o dal PC da remoto.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Magnet>
                  <Button size="lg" className="h-12 px-6 text-base shadow-lg shadow-primary/25" asChild>
                    <Link href="/characters">
                      Inizia a giocare
                      <ArrowRight />
                    </Link>
                  </Button>
                </Magnet>
                <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
                  <ScrollLink target="#come-funziona">Come funziona</ScrollLink>
                </Button>
              </div>
            </div>
            <HeroDie />
          </div>
        </section>

        {/* Cosa puoi fare: griglia bento */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-4xl tracking-wide md:text-5xl">Cosa puoi fare</h2>
          <p className="mt-2 text-muted-foreground">Tutto quello che serve prima, durante e dopo la sessione.</p>
          <div className="mt-8">
            <FeatureBento />
          </div>
        </section>

        {/* Come funziona: timeline che si disegna allo scroll */}
        <section
          id="come-funziona"
          className="scroll-mt-[calc(var(--nav-h)+1rem)] border-y bg-secondary/30"
        >
          <div className="mx-auto w-full max-w-3xl px-4 py-16">
            <h2 className="text-4xl tracking-wide md:text-5xl">Come funziona</h2>
            <HowItWorks />
          </div>
        </section>

        {/* Invito finale */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="banner-animated relative isolate flex flex-col items-start gap-5 overflow-hidden rounded-3xl p-8 text-primary-foreground md:flex-row md:items-center md:justify-between md:p-12">
            {/* Grana leggera sopra il gradiente */}
            <div aria-hidden className="bg-noise pointer-events-none absolute inset-0 -z-10 opacity-20 mix-blend-overlay" />
            <div>
              <h2 className="text-4xl tracking-wide">Pronto per la prossima sessione?</h2>
              <p className="mt-1 text-primary-foreground/90">Crea il tuo primo personaggio in pochi minuti.</p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="h-12 px-6 text-base transition-shadow duration-300 hover:shadow-[0_0_32px_rgba(117,221,221,0.65)]"
              asChild
            >
              <Link href="/characters/new">
                Crea un personaggio
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </SmoothScroll>
  )
}
