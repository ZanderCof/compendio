"use client"

import { useRef } from "react"
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react"

/**
 * Effetto calamita (Magnet di React Bits): il contenuto segue un po' il cursore quando gli passa vicino.
 * Solo con il mouse: sul telefono e con "riduci movimento" resta fermo.
 */
export function Magnet({ children, strength = 0.3 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 })
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 })

  return (
    <motion.div
      ref={ref}
      // Area più grande del pulsante: la calamita si sente già un po' prima di arrivarci sopra
      className="-m-6 inline-block p-6"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse" || !ref.current) return
        const rect = ref.current.getBoundingClientRect()
        x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
        y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}
