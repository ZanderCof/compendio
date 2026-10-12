import Link from "next/link"
import { Suspense } from "react"
import { Dices } from "lucide-react"

import { MainNav, NavItems } from "./mainNav"
import { UserMenu } from "./userMenu"

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        {/* Il percorso corrente è noto solo a runtime: finché non arriva, link senza evidenziazione */}
        <Suspense fallback={<NavItems />}>
          <MainNav />
        </Suspense>

        <Link
          href="/"
          className="flex items-center gap-2 text-xl tracking-wide md:order-first md:mr-4"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-plum to-violet text-primary-foreground">
            <Dices className="size-5" />
          </span>
          Compendio
        </Link>

        <div className="ml-auto">
          {/* La sessione si legge dai cookie: la navbar resta statica, il menu utente arriva subito dopo */}
          <Suspense fallback={<div className="size-8 animate-pulse rounded-full bg-muted" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
