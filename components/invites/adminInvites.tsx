"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { Ban, Check, Copy, LoaderCircle, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createInvite, revokeInvite } from "@/features/invites/actions"

function inviteLink(code: string) {
  return `${window.location.origin}/invite/${code}`
}

/** Copia il link d'invito negli appunti. */
export function CopyInviteLink({ code, disabled }: { code: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteLink(code))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Non riesco a copiare: copia il link a mano", { description: inviteLink(code) })
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={copy} disabled={disabled}>
      {copied ? <Check /> : <Copy />}
      {copied ? "Copiato" : "Copia link"}
    </Button>
  )
}

export function RevokeInviteButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Revocare l'invito "${label}"? Il link smetterà di funzionare.`)) return
        startTransition(async () => {
          const result = await revokeInvite(id)
          if (result?.error) toast.error(result.error)
          else toast.success("Invito revocato")
        })
      }}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <Ban />}
      Revoca
    </Button>
  )
}

export function CreateInviteForm() {
  const [state, action, pending] = useActionState(createInvite, undefined)

  // Appena creato, il link finisce negli appunti
  useEffect(() => {
    if (!state?.code) return
    const link = inviteLink(state.code)
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success("Invito creato e link copiato"))
      .catch(() => toast.success("Invito creato", { description: link }))
  }, [state])

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <label className="flex flex-col gap-1 text-sm">
        Etichetta
        <Input name="label" placeholder="Es. Davide, Gruppo del giovedì" required maxLength={80} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Usi massimi
        <Input name="maxUses" type="number" min={1} max={500} defaultValue={1} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Scadenza (facoltativa)
        <Input name="expiresOn" type="date" />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
        Crea invito
      </Button>
      {state?.error && (
        <p className="text-sm text-destructive sm:col-span-4" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}
