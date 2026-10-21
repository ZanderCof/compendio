import Link from "next/link"
import { Suspense } from "react"
import { Dices } from "lucide-react"

import { NavItems } from "./mainNav"
import { NavbarScroll } from "./navbarScroll"
import { NavWithBadges } from "./navWithBadges"
import { UserMenu } from "./userMenu"

export function Navbar() {
  return (
    // viewTransitionName: la navbar resta ferma durante le transizioni tra le pagine.
    // Altezza in --nav-h: si restringe dopo 40 px di scroll (data-scrolled su <html>, vedi globals.css)
    <header
      className={
        "sticky top-0 z-40 h-(--nav-h) border-b border-transparent transition-[height,background-color,border-color,box-shadow] duration-300 " +
        "[html[data-scrolled]_&]:border-border [html[data-scrolled]_&]:bg-background/80 [html[data-scrolled]_&]:shadow-sm [html[data-scrolled]_&]:backdrop-blur-md"
      }
      style={{ viewTransitionName: "site-header" }}
    >
      <NavbarScroll />
      <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-2 px-4">
        {/* Percorso e avvisi sono noti solo a runtime: finché non arrivano, link semplici */}
        <Suspense fallback={<NavItems />}>
          <NavWithBadges />
        </Suspense>

        <Link
          href="/"
          className="font-display flex items-center gap-2 text-xl tracking-wide md:order-first md:mr-4"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-plum to-violet text-primary-foreground transition-transform duration-300 [html[data-scrolled]_&]:scale-90">
            <Dices className="size-5" />
          </span>
          Compendio
        </Link>

        <div className="ml-auto flex items-center gap-1">
          {/* La sessione si legge dai cookie: la navbar resta statica, il menu utente arriva subito dopo */}
          <Suspense fallback={<div className="size-8 animate-pulse rounded-full bg-muted" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
