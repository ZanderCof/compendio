"use client"

import { useTransition } from "react"
import { Check, LoaderCircle, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { decideAccessRequest } from "@/features/admin/actions"

/** Approva / Rifiuta. Su una richiesta già decisa mostra solo l'azione opposta. */
export function RequestActions({
  id,
  name,
  status,
}: {
  id: string
  name: string
  status: "PENDING" | "APPROVED" | "REJECTED"
}) {
  const [pending, startTransition] = useTransition()

  function decide(approve: boolean) {
    startTransition(async () => {
      const result = await decideAccessRequest(id, approve)
      if (result?.error) toast.error(result.error)
      else toast.success(approve ? `${name} può entrare` : `Richiesta di ${name} rifiutata`)
    })
  }

  return (
    <div className="flex gap-2">
      {status !== "APPROVED" && (
        <Button size="sm" onClick={() => decide(true)} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Approva
        </Button>
      )}
      {status !== "REJECTED" && (
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => decide(false)} disabled={pending}>
          <X />
          {status === "APPROVED" ? "Revoca" : "Rifiuta"}
        </Button>
      )}
    </div>
  )
}
