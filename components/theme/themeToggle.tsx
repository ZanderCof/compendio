"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { switchTheme } from "./switchTheme"

/** Pulsante sole/luna per chi non ha fatto l'accesso (chi è dentro ha il tema nel menu dell'avatar). */
export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cambia tema chiaro/scuro"
      onClick={(e) => {
        const dark = document.documentElement.classList.contains("dark")
        switchTheme(dark ? "light" : "dark", setTheme, { x: e.clientX, y: e.clientY })
      }}
    >
      {/* L'icona dipende dalla classe "dark", non da JavaScript: niente salti al caricamento */}
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  )
}
