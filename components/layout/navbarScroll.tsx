"use client"

import { useEffect } from "react"

// Oltre questi pixel di scroll la navbar si restringe e prende sfondo e sfocatura
const THRESHOLD = 40

/** Segna su <html> se la pagina è scrollata (data-scrolled): lo leggono navbar e CSS. */
export function NavbarScroll() {
  useEffect(() => {
    const root = document.documentElement
    let ticking = false
    const update = () => {
      ticking = false
      root.toggleAttribute("data-scrolled", window.scrollY > THRESHOLD)
    }
    const onScroll = () => {
      // Al massimo un controllo per fotogramma
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      root.removeAttribute("data-scrolled")
    }
  }, [])
  return null
}
