"use client"

import { useActionState, useState } from "react"
import { Check, LoaderCircle, Save, Settings, Trash2 } from "lucide-react"

import { ConfirmButton } from "@/components/shared/confirmButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { deleteCampaign, updateCampaign } from "@/features/campaigns/actions"

const labelClass = "text-xs tracking-widest text-muted-foreground"

/** Pannello del master: nome, descrizione ed eliminazione della campagna. */
export function CampaignSettings({
  campaignId,
  name,
  description,
}: {
  campaignId: string
  name: string
  description: string | null
}) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(updateCampaign.bind(null, campaignId), undefined)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings />
          Gestisci
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl tracking-wide">Gestisci la campagna</SheetTitle>
          <SheetDescription>Solo tu, come master, puoi modificarla.</SheetDescription>
        </SheetHeader>

        <form action={action} className="flex flex-col gap-4 px-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Nome</span>
            <Input name="name" defaultValue={name} required maxLength={80} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Descrizione</span>
            <textarea
              name="description"
              defaultValue={description ?? ""}
              maxLength={500}
              rows={4}
              className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            {state?.saved && !pending && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground" role="status">
                <Check className="size-4" />
                Salvato
              </span>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
              Salva
            </Button>
          </div>
        </form>

        <div className="mx-4 mt-8 flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <h3 className="tracking-wide text-destructive">Elimina la campagna</h3>
          <p className="text-sm text-muted-foreground">
            Si cancellano membri, inviti, sessioni e chat. I personaggi restano ai giocatori, senza
            campagna. Non si può annullare.
          </p>
          <ConfirmButton
            className="self-start"
            icon={<Trash2 />}
            label="Elimina campagna"
            confirmLabel="Tocca di nuovo per eliminare"
            action={() => deleteCampaign(campaignId)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
