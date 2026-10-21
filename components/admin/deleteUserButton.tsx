"use client"

import { useState, useTransition } from "react"
import { LoaderCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { deleteUserProfile } from "@/features/admin/actions"

/**
 * Elimina un profilo dopo conferma: il dialog elenca cosa sparisce e chiede di scrivere il nome,
 * così non si elimina nessuno per sbaglio.
 */
export function DeleteUserButton({
  id,
  name,
  email,
  characters,
  soleMasterOf,
}: {
  id: string
  name: string
  email: string
  characters: number
  soleMasterOf: string[]
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [pending, startTransition] = useTransition()
  const confirmed = typed.trim().toLowerCase() === name.trim().toLowerCase()

  function remove() {
    startTransition(async () => {
      const result = await deleteUserProfile(id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Profilo di ${name} eliminato`)
      setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setTyped("")
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Elimina il profilo di ${name}`}>
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-3xl tracking-wide">Eliminare {name}?</DialogTitle>
          <DialogDescription>
            {email}. L&apos;operazione non si può annullare.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          <li>L&apos;account e l&apos;accesso con Google (le sessioni aperte si chiudono)</li>
          <li>
            {characters === 0 ? "Nessun personaggio" : characters === 1 ? "1 personaggio" : `${characters} personaggi`}, con
            tiri, voci di diario, messaggi e voti
          </li>
          <li>Le iscrizioni alle campagne degli altri</li>
          {soleMasterOf.length > 0 && (
            <li className="text-destructive">
              Le campagne di cui è l&apos;unico master, con tutto il loro contenuto: {soleMasterOf.join(", ")}
            </li>
          )}
          <li>La sua richiesta di accesso: con la beta su invito, per rientrare servirà un nuovo invito</li>
        </ul>
        <label className="flex flex-col gap-1 text-sm">
          Scrivi <strong>{name}</strong> per confermare
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </label>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annulla</Button>
          </DialogClose>
          <Button variant="destructive" disabled={!confirmed || pending} onClick={remove}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
            Elimina per sempre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
