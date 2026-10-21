"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Ticket, UserRoundPlus, UsersRound } from "lucide-react"

import { cn } from "@/lib/utils"

export type AdminTab = "utenti" | "richieste" | "inviti"

const TABS = [
  { id: "utenti", label: "Utenti", icon: UsersRound },
  { id: "richieste", label: "Richieste", icon: UserRoundPlus },
  { id: "inviti", label: "Inviti", icon: Ticket },
] as const

/** Schede della pagina admin: link con ?scheda=, così restano nell'URL e funzionano senza JS. */
export function AdminTabs({ active, pending }: { active: AdminTab; pending: number }) {
  return (
    <nav aria-label="Sezioni amministrazione" className="flex gap-1 rounded-xl border bg-card p-1 shadow-sm">
      {TABS.map((tab) => {
        const isActive = tab.id === active
        const Icon = tab.icon
        return (
          <Link
            key={tab.id}
            href={`/admin?scheda=${tab.id}`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "font-display relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-lg tracking-wide transition-colors sm:flex-none",
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="admin-tab-active"
                className="absolute inset-0 -z-0 rounded-lg bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <Icon className="relative size-4" />
            <span className="relative">{tab.label}</span>
            {tab.id === "richieste" && pending > 0 && (
              <span
                className={cn(
                  "relative min-w-5 rounded-full px-1.5 font-sans text-xs leading-5",
                  isActive ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                )}
              >
                {pending}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
