"use client"

import { useEffect, useRef } from "react"
import { animate } from "motion"

const formatNumber = (n: number, signed: boolean) => (signed && n >= 0 ? `+${n}` : String(n))

/**
 * Numero che conta fino al valore (CountUp di React Bits): da 0 all'apertura, poi dal valore
 * precedente quando cambia. Il server e il primo render mostrano già il valore finale.
 */
export function CountUp({
  value,
  signed = false,
  duration = 0.9,
  className,
}: {
  value: number
  /** Mostra il segno + davanti ai positivi (bonus) */
  signed?: boolean
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef<number | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const from = previous.current ?? 0
    previous.current = value
    if (from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.textContent = formatNumber(value, signed)
      return
    }
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => {
        element.textContent = formatNumber(Math.round(n), signed)
      },
    })
    return () => controls.stop()
  }, [value, signed, duration])

  return (
    <span ref={ref} className={className}>
      {formatNumber(value, signed)}
    </span>
  )
}
