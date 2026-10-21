"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { CircleAlert, LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import type { SaveStatus } from "./characterProvider"

/** Spunta che si disegna (path animato) quando il salvataggio finisce. */
function DrawnCheck({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35 }}
      />
      <motion.path
        d="m8 12.5 2.5 2.5L16 9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      />
    </svg>
  )
}

const LABELS: Record<SaveStatus, string> = {
  saving: "Salvataggio…",
  saved: "Salvato",
  error: "Non salvato",
}

/** Stato del salvataggio automatico: in corso → salvato ✓ → (eventuale) errore che vibra. */
export function SaveIndicator({ status }: { status: SaveStatus }) {
  const reduced = useReducedMotion()

  return (
    <span role="status" aria-live="polite" className="relative inline-flex h-6 min-w-28 items-center justify-end overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={
            status === "error" && !reduced
              ? { opacity: 1, y: 0, x: [0, -4, 4, -3, 3, 0] }
              : { opacity: 1, y: 0 }
          }
          exit={reduced ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
            status === "saving" && "text-muted-foreground",
            status === "saved" && "text-emerald-600 dark:text-emerald-400",
            status === "error" && "bg-destructive/10 text-destructive"
          )}
        >
          {status === "saving" && <LoaderCircle className="size-3.5 animate-spin" />}
          {status === "saved" && <DrawnCheck animate={!reduced} />}
          {status === "error" && <CircleAlert className="size-3.5" />}
          {LABELS[status]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
