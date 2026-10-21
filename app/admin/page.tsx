import type { Metadata } from "next"
import { Suspense } from "react"
import { Activity, Radio, UserRoundPlus, UsersRound } from "lucide-react"

import { AdminTabs, type AdminTab } from "@/components/admin/adminTabs"
import { InvitesPanel, MissionsPanel, RequestsPanel, UsersPanel } from "@/components/admin/panels"
import { adminStats } from "@/features/admin/queries"
import { isInviteOnly } from "@/features/invites/rules"
import { requireAdmin } from "@/lib/admin"

export const metadata: Metadata = { title: "Amministrazione · Compendio" }

type SearchParams = PageProps<"/admin">["searchParams"]

const TABS: AdminTab[] = ["utenti", "richieste", "inviti", "missioni"]

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <Admin searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Admin({ searchParams }: { searchParams: SearchParams }) {
  // Protezione lato server: chi non è admin riceve un 404. Anche ogni action controlla di nuovo.
  const [, params] = await Promise.all([requireAdmin(), searchParams])
  const stats = await adminStats()

  const tab = TABS.find((t) => t === params.scheda) ?? "utenti"
  const search = typeof params.q === "string" ? params.q.slice(0, 100) : ""

  const counters = [
    { label: "Utenti", value: stats.users, icon: UsersRound },
    { label: "Online ora", value: stats.online, icon: Radio },
    { label: "Attivi in 7 giorni", value: stats.activeWeek, icon: Activity },
    { label: "Richieste in attesa", value: stats.pendingRequests, icon: UserRoundPlus, highlight: stats.pendingRequests > 0 },
  ]

  return (
    <>
      <div>
        <h1 className="text-5xl tracking-wide">Amministrazione</h1>
        <p className="mt-1 text-muted-foreground">
          {isInviteOnly()
            ? "Beta su invito attiva: i nuovi utenti entrano solo con un invito o una richiesta approvata."
            : "INVITE_ONLY è spento: la registrazione è libera e non arrivano richieste."}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {counters.map(({ label, value, icon: Icon, highlight }) => (
          <div
            key={label}
            className={
              "flex flex-col gap-1 rounded-2xl border bg-card p-4 " + (highlight ? "border-primary/50 bg-primary/5" : "")
            }
          >
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon className="size-4" />
              {label}
            </dt>
            <dd className="font-display text-4xl leading-none">{value}</dd>
          </div>
        ))}
      </dl>

      <AdminTabs active={tab} pending={stats.pendingRequests} />

      <Suspense key={`${tab}:${search}`} fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        {tab === "utenti" && <UsersPanel search={search} />}
        {tab === "richieste" && <RequestsPanel />}
        {tab === "inviti" && <InvitesPanel />}
        {tab === "missioni" && <MissionsPanel />}
      </Suspense>
    </>
  )
}
