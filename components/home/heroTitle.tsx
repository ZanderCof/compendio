"use client"

import { motion, useReducedMotion } from "motion/react"

/**
 * Titolo della home: le parole entrano una dopo l'altra uscendo dalla sfocatura (stile BlurText di React Bits).
 * La parola evidenziata ha un gradiente che scorre lentamente.
 */
export function HeroTitle({ text, highlight }: { text: string; highlight: string }) {
  const reduced = useReducedMotion()
  const words = text.split(" ")

  return (
    <h1 className="max-w-3xl text-5xl leading-[0.95] tracking-wide md:text-7xl">
      {words.map((word, i) => {
        const isHighlight = word === highlight
        return (
          <motion.span
            key={`${word}-${i}`}
            className="inline-block"
            initial={reduced ? false : { opacity: 0, filter: "blur(12px)", y: 16 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={isHighlight ? "text-gradient-pan" : undefined}>{word}</span>
            {i < words.length - 1 && " "}
          </motion.span>
        )
      })}
    </h1>
  )
}
