"use client"

import { useState, useTransition } from "react"
import { Check, Copy, LoaderCircle, LogOut, RefreshCw, UserMinus, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { ConfirmButton } from "@/components/shared/confirmButton"
import { Button } from "@/components/ui/button"
import { leaveCampaign, regenerateInviteCode, removeMember } from "@/features/campaigns/actions"
import { setCharacterCampaign } from "@/features/characters/actions"

/** Link di invito con copia e rigenerazione. Lo vede solo il master. */
export function InvitePanel({ campaignId, inviteCode }: { campaignId: string; inviteCode: string }) {
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  const path = `/join/${inviteCode}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Non riesco a copiare: seleziona il link a mano")
    }
  }

  function regenerate() {
    startTransition(async () => {
      const result = await regenerateInviteCode(campaignId)
      if (result?.error) toast.error(result.error)
      else toast.success("Nuovo link creato: quello vecchio non funziona più")
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Manda questo link ai tuoi giocatori: dopo il login entreranno nella campagna.
      </p>
      <div className="flex gap-2">
        <code className="flex-1 truncate rounded-lg border bg-muted px-3 py-2 font-mono text-xs leading-5">
          {path}
        </code>
        <Button onClick={copy} variant="secondary" className="h-9">
          {copied ? <Check /> : <Copy />}
          {copied ? "Copiato" : "Copia link"}
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={regenerate} disabled={pending} className="self-start">
        {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
        Crea un nuovo link
      </Button>
    </div>
  )
}

/** Porta in campagna uno dei propri personaggi che non ne fa ancora parte. */
export function AddCharacterToCampaign({
  campaignId,
  characters,
}: {
  campaignId: string
  characters: { id: string; name: string; campaignName: string | null }[]
}) {
  const [selected, setSelected] = useState(characters[0]?.id ?? "")
  const [pending, startTransition] = useTransition()

  if (characters.length === 0) return null

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const result = await setCharacterCampaign(selected, campaignId)
          if (result?.error) toast.error(result.error)
        })
      }}
    >
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        aria-label="Personaggio da aggiungere"
        className="h-8 min-w-40 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.campaignName ? ` (ora in ${c.campaignName})` : ""}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" disabled={pending || !selected}>
        {pending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
        Porta in campagna
      </Button>
    </form>
  )
}

/** Il master toglie un giocatore dalla campagna. */
export function RemoveMemberButton({
  campaignId,
  memberId,
  memberName,
}: {
  campaignId: string
  memberId: string
  memberName: string
}) {
  return (
    <ConfirmButton
      size="xs"
      variant="ghost"
      className="text-destructive"
      icon={<UserMinus />}
      label="Rimuovi"
      confirmLabel={`Rimuovere ${memberName}?`}
      aria-label={`Rimuovi ${memberName} dalla campagna`}
      action={() => removeMember(campaignId, memberId)}
    />
  )
}

/** Un giocatore esce dalla campagna: i suoi personaggi restano suoi. */
export function LeaveCampaignButton({ campaignId }: { campaignId: string }) {
  return (
    <ConfirmButton
      size="sm"
      variant="outline"
      className="text-destructive"
      icon={<LogOut />}
      label="Esci dalla campagna"
      confirmLabel="Tocca di nuovo per uscire"
      action={() => leaveCampaign(campaignId)}
    />
  )
}
