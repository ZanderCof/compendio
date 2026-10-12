"use client"

import { useTransition } from "react"
import { Check, LoaderCircle, Mail, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { respondToInvitation } from "@/features/campaigns/invitations"

type ReceivedInvitation = {
  id: string
  campaign: { name: string; description: string | null }
  invitedBy: { name: string }
}

function InvitationRow({ invitation }: { invitation: ReceivedInvitation }) {
  const [pending, startTransition] = useTransition()

  function respond(accept: boolean) {
    startTransition(async () => {
      // Se accetta, l'azione porta direttamente alla campagna
      const result = await respondToInvitation(invitation.id, accept)
      if (result?.error) toast.error(result.error)
      else if (!accept) toast.success("Invito rifiutato")
    })
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-primary/40 bg-secondary/50 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Mail className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg leading-tight tracking-wide">{invitation.campaign.name}</p>
        <p className="text-sm text-muted-foreground">Ti ha invitato {invitation.invitedBy.name}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={pending} onClick={() => respond(false)}>
          <X />
          Rifiuta
        </Button>
        <Button disabled={pending} onClick={() => respond(true)}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Accetta
        </Button>
      </div>
    </li>
  )
}

export function ReceivedInvitations({ invitations }: { invitations: ReceivedInvitation[] }) {
  if (invitations.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs tracking-widest text-muted-foreground">Inviti ricevuti</h2>
      <ul className="flex flex-col gap-2">
        {invitations.map((invitation) => (
          <InvitationRow key={invitation.id} invitation={invitation} />
        ))}
      </ul>
    </section>
  )
}
