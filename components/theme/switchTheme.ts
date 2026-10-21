"use client"

export type ThemeChoice = "light" | "dark" | "system"

const resolve = (theme: ThemeChoice) =>
  theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme

/**
 * Cambia tema con un cerchio che si allarga dal punto toccato (View Transitions API).
 * Senza supporto del browser, o con "riduci movimento", il tema cambia e basta.
 */
export function switchTheme(next: ThemeChoice, setTheme: (theme: string) => void, origin?: { x: number; y: number }) {
  const root = document.documentElement
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const willBeDark = resolve(next) === "dark"

  if (!document.startViewTransition || reduced || willBeDark === root.classList.contains("dark")) {
    setTheme(next)
    return
  }

  const x = origin?.x ?? window.innerWidth - 40
  const y = origin?.y ?? 28
  // Raggio fino all'angolo più lontano: il cerchio copre tutto lo schermo
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  root.classList.add("theme-switching")
  const transition = document.startViewTransition(() => {
    // La classe va cambiata subito, dentro la transizione; next-themes poi salva la scelta
    root.classList.toggle("dark", willBeDark)
    root.style.colorScheme = willBeDark ? "dark" : "light"
    setTheme(next)
  })

  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 450, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
      )
    })
    .catch(() => {})
  transition.finished.finally(() => root.classList.remove("theme-switching"))
}
