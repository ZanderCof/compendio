"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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

/** Link della navbar con quello della pagina corrente evidenziato. */
export function MainNav() {
  return <NavItems pathname={usePathname()} />
}

/**
 * Link della navbar: in riga su desktop, in un menu a tendina su telefono.
 * Senza pathname (mentre la pagina carica) nessun link è evidenziato.
 */
export function NavItems({ pathname = "" }: { pathname?: string }) {
  return (
    <>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Principale">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(pathname, link.href) ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive(pathname, link.href) && "bg-secondary text-primary"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Apri menu">
            <Menu />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {NAV_LINKS.map((link) => (
            <DropdownMenuItem key={link.href} asChild>
              <Link
                href={link.href}
                className={cn(isActive(pathname, link.href) && "text-primary")}
              >
                {link.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
