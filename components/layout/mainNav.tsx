"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { NAV_LINKS, isActive } from "./navLinks"

type Badges = Partial<Record<string, number>>

/** Link della navbar con quello della pagina corrente evidenziato. */
export function MainNav({ badges }: { badges?: Badges }) {
  return <NavItems pathname={usePathname()} badges={badges} />
}

/** Pallino di avviso accanto a un link (es. sondaggi da votare). */
function Dot({ count, label }: { count?: number; label: string }) {
  if (!count) return null
  return (
    <span className="ml-1.5 inline-block size-2 rounded-full bg-primary align-middle" aria-label={`${count} ${label}`} />
  )
}

/**
 * Link della navbar: in riga su desktop, in un menu a tendina su telefono.
 * Senza pathname (mentre la pagina carica) nessun link è evidenziato.
 */
export function NavItems({ pathname = "", badges = {} }: { pathname?: string; badges?: Badges }) {
  const reducedMotion = useReducedMotion()

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Principale">
        {NAV_LINKS.map((link) => {
          const active = isActive(pathname, link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              // Le pagine della navbar si precaricano: la navigazione parte subito
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "font-display relative z-0 rounded-lg px-3 py-1.5 tracking-wide transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Indicatore della voce attiva: scorre da un link all'altro (layout animation) */}
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 -z-10 rounded-lg bg-secondary"
                  transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {link.label}
              <Dot count={badges[link.href]} label="da guardare" />
            </Link>
          )
        })}
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative md:hidden" aria-label="Apri menu">
            <Menu />
            {Object.values(badges).some(Boolean) && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {NAV_LINKS.map((link) => (
            <DropdownMenuItem key={link.href} asChild>
              <Link href={link.href} className={cn("font-display", isActive(pathname, link.href) && "text-primary")}>
                {link.label}
                <Dot count={badges[link.href]} label="da guardare" />
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
