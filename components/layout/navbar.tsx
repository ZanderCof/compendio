import Link from "next/link"
import { Suspense } from "react"
import { Dices } from "lucide-react"

import { ThemeToggle } from "@/components/theme/themeToggle"
import { NavItems } from "./mainNav"
import { NavWithBadges } from "./navWithBadges"
import { UserMenu } from "./userMenu"

export function Navbar() {
  return (
    // viewTransitionName: la navbar resta ferma durante le transizioni tra le pagine
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        {/* Percorso e avvisi sono noti solo a runtime: finché non arrivano, link semplici */}
        <Suspense fallback={<NavItems />}>
          <NavWithBadges />
        </Suspense>

        <Link
          href="/"
          className="font-display flex items-center gap-2 text-xl tracking-wide md:order-first md:mr-4"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-plum to-violet text-primary-foreground">
            <Dices className="size-5" />
          </span>
          Compendio
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {/* La sessione si legge dai cookie: la navbar resta statica, il menu utente arriva subito dopo */}
          <Suspense fallback={<div className="size-8 animate-pulse rounded-full bg-muted" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
