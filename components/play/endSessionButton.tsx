"use client"

import { Flag } from "lucide-react"

import { ConfirmButton } from "@/components/shared/confirmButton"
import { endSession } from "@/features/sessions/actions"

export function EndSessionButton({ campaignId }: { campaignId: string }) {
  return (
    <ConfirmButton
      variant="outline"
      icon={<Flag />}
      label="Termina sessione"
      confirmLabel="Tocca di nuovo per terminare"
      action={() => endSession(campaignId)}
    />
  )
}
