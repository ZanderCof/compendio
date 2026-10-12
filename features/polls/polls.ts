import { z } from "zod"

export type Answer = "YES" | "MAYBE" | "NO"

export const MAX_OPTIONS = 6

/** Le date proposte: almeno una, al massimo 6, tutte nel futuro e senza doppioni. */
export function pollDatesSchema(now = new Date()) {
  return z
    .array(z.iso.datetime({ offset: true }))
    .min(1, "Proponi almeno una data")
    .max(MAX_OPTIONS, `Al massimo ${MAX_OPTIONS} date`)
    // pipe: i controlli sulle date partono solo se sono tutte date valide
    .transform((isos) => isos.map((iso) => new Date(iso)))
    .pipe(
      z
        .array(z.date())
        .refine((dates) => dates.every((d) => d.getTime() > now.getTime()), "Le date devono essere nel futuro")
        .refine(
          (dates) => new Set(dates.map((d) => d.getTime())).size === dates.length,
          "Hai proposto due volte la stessa data"
        )
        .transform((dates) => [...dates].sort((a, b) => a.getTime() - b.getTime()))
    )
}

export type OptionTally = { yes: number; maybe: number; no: number; missing: number; score: number }

/** Conta le risposte di una data. "Sì" vale 2, "Forse" 1: serve a suggerire la data migliore. */
export function tally(answers: (Answer | undefined)[]): OptionTally {
  const yes = answers.filter((a) => a === "YES").length
  const maybe = answers.filter((a) => a === "MAYBE").length
  const no = answers.filter((a) => a === "NO").length
  return { yes, maybe, no, missing: answers.length - yes - maybe - no, score: yes * 2 + maybe }
}

/** Indici delle date migliori (a pari merito anche più di una). Nessuna se nessuno ha ancora detto sì o forse. */
export function bestOptions(tallies: OptionTally[]): number[] {
  const top = Math.max(0, ...tallies.map((t) => t.score))
  if (top === 0) return []
  return tallies.flatMap((t, i) => (t.score === top ? [i] : []))
}

// Le date si mostrano sempre con l'ora italiana, ovunque giri il server
const pollDateFormat = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
})

/** "Sabato 17 ottobre alle ore 21:00": ora italiana, iniziale maiuscola. */
export function formatPollDate(date: Date) {
  const text = pollDateFormat.format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}
