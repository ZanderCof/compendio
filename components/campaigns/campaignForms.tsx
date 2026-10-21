"use client"

import { useActionState, useEffect, useState } from "react"
import { Link2, LoaderCircle, LogIn, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

const NAME_MAX = 80
const DESCRIPTION_MAX = 500

function CreateCampaignForm({ onCreated }: { onCreated: () => void }) {
  const [state, action, pending] = useActionState(createCampaign, undefined)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // Creata: si chiude il dialog e la nuova card entra in cima alla lista
  useEffect(() => {
    if (!state?.createdId) return
    toast.success("Campagna creata: sei il master")
    onCreated()
  }, [state, onCreated])

  const tooLong = name.length > NAME_MAX || description.length > DESCRIPTION_MAX

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <Input
          name="name"
          placeholder="Es. La miniera perduta"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={name.length > NAME_MAX}
        />
        <span className="self-end text-xs text-muted-foreground tabular-nums">
          {name.length}/{NAME_MAX}
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Di cosa parla (facoltativo)
        <textarea
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={description.length > DESCRIPTION_MAX}
          className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
        <span className="self-end text-xs text-muted-foreground tabular-nums">
          {description.length}/{DESCRIPTION_MAX}
        </span>
      </label>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" disabled={pending || !name.trim() || tooLong}>
        {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
        Crea e diventa master
      </Button>
    </form>
  )
}

/** "+ Nuova campagna" nell'intestazione: apre il form in un dialog. */
export function NewCampaignDialog() {
  const [open, setOpen] = useState(false)
  // Il form si rimonta a ogni apertura: campi ed errori ripartono da zero
  const [formKey, setFormKey] = useState(0)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setFormKey((k) => k + 1)
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus />
          Nuova campagna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-3xl tracking-wide">Nuova campagna</DialogTitle>
          <DialogDescription>Ne sarai il master: poi inviti gli amici con un link.</DialogDescription>
        </DialogHeader>
        <CreateCampaignForm key={formKey} onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

/** "Entra con link o codice": il form per unirsi alla campagna di un amico. */
export function JoinCampaignDialog() {
  const [state, action, pending] = useActionState(joinCampaignFromForm, undefined)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          <Link2 />
          Entra con link o codice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-3xl tracking-wide">Unisciti a una campagna</DialogTitle>
          <DialogDescription>Incolla il link che ti ha mandato il master, oppure solo il codice.</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <Input name="code" placeholder="https://…/join/… oppure il codice" aria-label="Link o codice invito" required autoFocus />
          <FormError message={state?.error} />
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
            Unisciti
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
