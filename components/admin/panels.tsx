import Form from "next/form"
import { Search } from "lucide-react"

import { DeleteUserButton } from "@/components/admin/deleteUserButton"
import { RequestActions } from "@/components/admin/requestActions"
import { CopyInviteLink, CreateInviteForm, RevokeInviteButton } from "@/components/invites/adminInvites"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { listAccessRequests, listUsers } from "@/features/admin/queries"
import { listInviteCodes } from "@/features/invites/queries"
import { checkInvite } from "@/features/invites/rules"
import { isAdminEmail } from "@/lib/admin"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

// Pannelli della pagina /admin. La pagina chiama requireAdmin() prima di mostrarli.

const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "Europe/Rome" })
const relative = new Intl.RelativeTimeFormat("it", { numeric: "auto" })

function ago(date: Date, now: Date) {
  const seconds = (date.getTime() - now.getTime()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return "poco fa"
}

const JOINED_VIA: Record<string, string> = {
  beta: "Invito",
  join: "Link campagna",
  email: "Invito email",
  request: "Richiesta approvata",
  admin: "Admin",
}

function UserAvatar({ name, image, online }: { name: string; image: string | null; online?: boolean }) {
  return (
    <span className="relative shrink-0">
      <Avatar className="size-10">
        {image && <AvatarImage src={image} alt="" />}
        <AvatarFallback className="bg-secondary">{initials(name)}</AvatarFallback>
      </Avatar>
      {online !== undefined && (
        <span
          aria-hidden
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card",
            online ? "bg-emerald-500" : "bg-muted-foreground/40"
          )}
        />
      )}
    </span>
  )
}

export async function UsersPanel({ search }: { search: string }) {
  const now = new Date()
  const users = await listUsers(search, now)

  return (
    <section className="flex flex-col gap-3">
      <Form action="/admin" className="relative max-w-sm">
        <input type="hidden" name="scheda" value="utenti" />
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={search} placeholder="Cerca per nome o email" aria-label="Cerca utenti" className="pl-8" />
      </Form>

      {users.length === 0 && <p className="text-muted-foreground">Nessun utente trovato.</p>}
      <ul className="flex flex-col divide-y rounded-2xl border bg-card">
        {users.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
            <UserAvatar name={user.name} image={user.image} online={user.online} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:w-auto sm:justify-end">
              <span className={user.online ? "text-emerald-600 dark:text-emerald-400" : undefined}>
                {user.online ? "Online" : user.lastSeenAt ? `Visto ${ago(user.lastSeenAt, now)}` : "Mai visto"}
              </span>
              <span>
                {user._count.characters} pg · {user._count.memberships} campagne
              </span>
              <span title={`Iscritto il ${dateFormat.format(user.createdAt)}`}>dal {dateFormat.format(user.createdAt)}</span>
              {user.joinedVia && (
                <Badge variant="outline">
                  {JOINED_VIA[user.joinedVia] ?? user.joinedVia}
                  {user.inviteCode && `: ${user.inviteCode.label}`}
                </Badge>
              )}
              {/* Gli admin (compreso te) non si eliminano da qui */}
              {isAdminEmail(user.email) ? (
                <Badge>Admin</Badge>
              ) : (
                <DeleteUserButton
                  id={user.id}
                  name={user.name}
                  email={user.email}
                  characters={user._count.characters}
                  soleMasterOf={user.soleMasterOf}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const REQUEST_STATUS = {
  PENDING: { label: "In attesa", variant: "default" },
  APPROVED: { label: "Approvata", variant: "secondary" },
  REJECTED: { label: "Rifiutata", variant: "destructive" },
} as const

export async function RequestsPanel() {
  const now = new Date()
  const { pending, decided } = await listAccessRequests()

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl tracking-wide">In attesa ({pending.length})</h2>
        {pending.length === 0 && (
          <p className="text-muted-foreground">
            Nessuna richiesta. Quando qualcuno senza invito prova ad accedere con Google, compare qui.
          </p>
        )}
        {pending.map((request) => (
          <article key={request.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-card p-4">
            <UserAvatar name={request.name} image={request.image} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{request.name}</p>
              <p className="truncate text-sm text-muted-foreground">{request.email}</p>
              <p className="text-xs text-muted-foreground">
                Prima richiesta {ago(request.createdAt, now)}
                {request.attempts > 1 && ` · ${request.attempts} tentativi, l'ultimo ${ago(request.lastAttemptAt, now)}`}
              </p>
            </div>
            <RequestActions id={request.id} name={request.name} status={request.status} />
          </article>
        ))}
      </div>

      {decided.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl tracking-wide">Storico</h2>
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {decided.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center gap-3 p-3">
                <UserAvatar name={request.name} image={request.image} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{request.name}</span>
                    <Badge variant={REQUEST_STATUS[request.status].variant}>{REQUEST_STATUS[request.status].label}</Badge>
                    {request.registered && <Badge variant="outline">Iscritto</Badge>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{request.email}</p>
                  {request.decidedAt && (
                    <p className="text-xs text-muted-foreground">
                      Decisa {ago(request.decidedAt, now)}
                      {request.decidedBy && ` da ${request.decidedBy.name}`}
                    </p>
                  )}
                </div>
                {/* Chi è già iscritto ha un account: la richiesta non conta più */}
                {!request.registered && <RequestActions id={request.id} name={request.name} status={request.status} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

const INVITE_STATUS = {
  valid: { label: "Attivo", variant: "default" },
  expired: { label: "Scaduto", variant: "secondary" },
  revoked: { label: "Revocato", variant: "destructive" },
  exhausted: { label: "Esaurito", variant: "secondary" },
  missing: { label: "—", variant: "secondary" },
} as const

export async function InvitesPanel() {
  const invites = await listInviteCodes()
  const now = new Date()

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-2xl tracking-wide">Nuovo invito</h2>
        <div className="mt-3">
          <CreateInviteForm />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-2xl tracking-wide">Codici ({invites.length})</h2>
        {invites.length === 0 && <p className="text-muted-foreground">Nessun invito ancora.</p>}
        {invites.map((invite) => {
          const status = checkInvite(invite, now)
          return (
            <article key={invite.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl tracking-wide">{invite.label}</h3>
                    <Badge variant={INVITE_STATUS[status].variant}>{INVITE_STATUS[status].label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {invite.uses}/{invite.maxUses} usi · creato il {dateFormat.format(invite.createdAt)}
                    {invite.createdBy ? ` da ${invite.createdBy.name}` : " dal terminale"}
                    {invite.expiresAt && ` · scade il ${dateFormat.format(invite.expiresAt)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <CopyInviteLink code={invite.code} disabled={status !== "valid"} />
                  {!invite.revokedAt && <RevokeInviteButton id={invite.id} label={invite.label} />}
                </div>
              </div>
              {invite.redeemedBy.length > 0 && (
                <ul className="flex flex-col gap-1 border-t pt-3 text-sm">
                  {invite.redeemedBy.map((user) => (
                    <li key={user.id} className="flex flex-wrap justify-between gap-x-3">
                      <span>
                        {user.name} <span className="text-muted-foreground">({user.email})</span>
                      </span>
                      <span className="text-muted-foreground">{dateFormat.format(user.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
