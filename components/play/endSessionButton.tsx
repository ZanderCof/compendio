"use client"

import { Flag } from "lucide-react"

import { ConfirmButton } from "@/components/shared/confirmButton"
import { endSession } from "@/features/sessions/actions"

export function EndSessionButton({ campaignId, compact = false }: { campaignId: string; compact?: boolean }) {
  return (
    <ConfirmButton
      variant="outline"
      size={compact ? "sm" : "default"}
      icon={<Flag />}
      // Compatto: solo l'icona, finché non si chiede la conferma
      label={compact ? "" : "Termina sessione"}
      confirmLabel={compact ? "Termina?" : "Tocca di nuovo per terminare"}
      aria-label="Termina sessione"
      action={() => endSession(campaignId)}
    />
  )
}
