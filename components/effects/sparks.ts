import gsap from "gsap"

// Scintille (ClickSpark di React Bits) per critici e fallimenti critici.
// Elementi DOM temporanei animati con GSAP: niente canvas, si rimuovono da soli a fine animazione.

const COLORS = {
  crit: ["#75DDDD", "#84C7D0", "#9368B7", "#AA3E98", "#FFFFFF"],
  fumble: ["#ef4444", "#9ca3af", "#6b7280"],
} as const

export type SparkVariant = keyof typeof COLORS

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Esplosione di scintille dal punto (x, y) dello schermo. Critico: verso l'alto e colorate; fallimento: cadono. */
export function burstSparks(x: number, y: number, variant: SparkVariant) {
  if (typeof window === "undefined" || reducedMotion()) return

  const layer = document.createElement("div")
  layer.setAttribute("aria-hidden", "true")
  Object.assign(layer.style, { position: "fixed", left: "0", top: "0", pointerEvents: "none", zIndex: "60" })
  document.body.append(layer)

  const count = variant === "crit" ? 22 : 12
  const colors = COLORS[variant]
  const timeline = gsap.timeline({ onComplete: () => layer.remove() })

  for (let i = 0; i < count; i++) {
    const spark = document.createElement("span")
    const size = gsap.utils.random(4, variant === "crit" ? 9 : 6)
    Object.assign(spark.style, {
      position: "absolute",
      left: `${x - size / 2}px`,
      top: `${y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: variant === "crit" && i % 3 === 0 ? "1px" : "9999px",
      background: colors[i % colors.length],
      boxShadow: variant === "crit" ? `0 0 8px ${colors[i % colors.length]}` : "none",
    })
    layer.append(spark)

    const angle = variant === "crit" ? (i / count) * Math.PI * 2 : gsap.utils.random(Math.PI * 0.15, Math.PI * 0.85)
    const distance = variant === "crit" ? gsap.utils.random(50, 110) : gsap.utils.random(20, 50)
    timeline.to(
      spark,
      {
        x: Math.cos(angle) * distance,
        y: variant === "crit" ? Math.sin(angle) * distance - 20 : Math.sin(angle) * distance + 60,
        rotation: gsap.utils.random(-180, 180),
        opacity: 0,
        scale: variant === "crit" ? 0.2 : 0.6,
        duration: gsap.utils.random(0.6, 1),
        ease: variant === "crit" ? "power3.out" : "power2.in",
      },
      0
    )
  }
}

/** Scintille dal centro di un elemento. */
export function burstFromElement(element: Element, variant: SparkVariant) {
  const rect = element.getBoundingClientRect()
  burstSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, variant)
}
