import Link from "next/link"
import { ArrowRight, Dices, ScrollText, ShieldCheck, Users } from "lucide-react"

import { Button } from "@/components/ui/button"

const FEATURES = [
  {
    icon: ScrollText,
    title: "Scheda sempre sottomano",
    description:
      "Caratteristiche, abilità, incantesimi e inventario divisi in sezioni, pensati per il telefono al tavolo.",
    accent: "from-plum/20 text-plum",
  },
  {
    icon: Dices,
    title: "Dadi con un tocco",
    description:
      "Tocca un'abilità o un attacco e il tiro parte, con vantaggio e svantaggio. Ogni lancio finisce nel registro.",
    accent: "from-violet/20 text-violet",
  },
  {
    icon: Users,
    title: "Master e giocatori",
    description:
      "Il master crea la campagna e invita il gruppo con un link. Ognuno vede quello che gli serve.",
    accent: "from-periwinkle/25 text-periwinkle",
  },
  {
    icon: ShieldCheck,
    title: "Modifiche con permesso",
    description:
      "Il master può proporre modifiche alle schede, ma è il giocatore ad accettarle o rifiutarle.",
    accent: "from-sky/25 text-sky",
  },
]

const STEPS = [
  { title: "Accedi con Google", description: "Nessuna password da ricordare." },
  { title: "Crea o unisciti", description: "Apri una campagna o entra con il link del master." },
  { title: "Gioca", description: "Crea il personaggio e tieni la scheda aggiornata in partita." },
]

export default function HomePage() {
  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,var(--palette-plum)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,var(--palette-aqua)_0%,transparent_55%)] opacity-20"
        />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 md:py-28">
          <span className="rounded-full border bg-card px-3 py-1 text-xs tracking-widest text-violet">
            D&amp;D 5ª edizione
          </span>
          <h1 className="max-w-3xl text-5xl leading-[0.95] tracking-wide md:text-7xl">
            Il compendio della tua{" "}
            <span className="bg-linear-to-r from-plum via-violet to-sky bg-clip-text text-transparent">
              campagna
            </span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Schede dei personaggi, lanci di dadi e campagne condivise. Tutto quello che serve al
            tuo gruppo, in un posto solo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="h-11 px-5 text-base" asChild>
              <Link href="/characters">
                Inizia a giocare
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-5 text-base" asChild>
              <Link href="#come-funziona">Come funziona</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Funzionalità */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="text-3xl tracking-wide md:text-4xl">Cosa puoi fare</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-xl border bg-card p-5">
              <div
                className={`flex size-10 items-center justify-center rounded-lg bg-linear-to-br to-transparent ${feature.accent}`}
              >
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg tracking-wide">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Come funziona */}
      <section id="come-funziona" className="scroll-mt-[calc(var(--nav-h)+1rem)] border-y bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-3xl tracking-wide md:text-4xl">Come funziona</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg tracking-wide">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Invito finale */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-linear-to-br from-plum to-violet p-8 text-primary-foreground md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl tracking-wide">Pronto per la prossima sessione?</h2>
            <p className="mt-1 opacity-90">Crea il tuo primo personaggio in pochi minuti.</p>
          </div>
          <Button size="lg" variant="secondary" className="h-11 px-5 text-base" asChild>
            <Link href="/characters">
              Crea un personaggio
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
