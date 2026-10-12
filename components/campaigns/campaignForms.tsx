"use client"

import { useActionState } from "react"
import { LoaderCircle, LogIn, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createCampaign, joinCampaignFromForm } from "@/features/campaigns/actions"

function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

export function CreateCampaignForm() {
  const [state, action, pending] = useActionState(createCampaign, undefined)

  return (
    <form action={action} className="flex flex-col gap-3">
      <Input name="name" placeholder="Nome della campagna" aria-label="Nome della campagna" required maxLength={80} />
      <textarea
        name="description"
        placeholder="Di cosa parla (facoltativo)"
        aria-label="Descrizione"
        maxLength={500}
        rows={2}
        className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
        Crea e diventa master
      </Button>
    </form>
  )
}

export function JoinCampaignForm() {
  const [state, action, pending] = useActionState(joinCampaignFromForm, undefined)

  return (
    <form action={action} className="flex flex-col gap-3">
      <Input
        name="code"
        placeholder="Incolla il link o il codice del master"
        aria-label="Link o codice invito"
        required
      />
      <FormError message={state?.error} />
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {pending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
        Unisciti
      </Button>
    </form>
  )
}
