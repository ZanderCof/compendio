"use client"

import { cn } from "@/lib/utils"

/**
 * Card con riflettore (SpotlightCard di React Bits): un alone colorato segue il cursore.
 * Solo al passaggio del mouse; su touch e con "riduci movimento" resta una card normale.
 */
export function SpotlightPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return
        const rect = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`)
        e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`)
      }}
      className={cn("group relative overflow-hidden rounded-2xl border bg-card shadow-sm", className)}
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-plum via-periwinkle to-aqua" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(380px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(147, 104, 183, 0.16), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
