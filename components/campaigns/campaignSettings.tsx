"use client"

import { useActionState, useState, useTransition } from "react"
import { Check, LoaderCircle, Save, ScrollText, Settings, Trash2 } from "lucide-react"
import { toast } from "sonner"

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
import { deleteCampaign, setAllowMissionCharacters, updateCampaign } from "@/features/campaigns/actions"

const labelClass = "text-xs tracking-widest text-muted-foreground"

/** Regola del master: la campagna ammette i personaggi con le missioni settimanali? */
function MissionRule({ campaignId, allow }: { campaignId: string; allow: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="mx-4 mt-8 flex flex-col gap-2 rounded-xl border p-4">
      <h3 className="flex items-center gap-2 tracking-wide">
        <ScrollText className="size-4 text-violet" />
        Missioni settimanali
      </h3>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={allow}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked
            startTransition(async () => {
              const result = await setAllowMissionCharacters(campaignId, next)
              if (result?.error) toast.error(result.error)
              else toast.success(next ? "Ora la campagna ammette i personaggi con le missioni" : "Solo personaggi senza missioni")
            })
          }}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          Ammetti personaggi con le missioni settimanali
          <span className="block text-xs text-muted-foreground">
            Se la togli, nella campagna entrano solo personaggi senza bonus guadagnati fuori dal gioco.
          </span>
        </span>
        {pending && <LoaderCircle className="size-4 shrink-0 animate-spin" />}
      </label>
    </div>
  )
}

/** Pannello del master: nome, descrizione, regola delle missioni ed eliminazione della campagna. */
export function CampaignSettings({
  campaignId,
  name,
  description,
  allowMissionCharacters,
}: {
  campaignId: string
  name: string
  description: string | null
  allowMissionCharacters: boolean
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

        <MissionRule campaignId={campaignId} allow={allowMissionCharacters} />

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
