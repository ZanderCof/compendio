"use client"

import { useEffect, useState, useTransition } from "react"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type ConfirmButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick" | "children"> & {
  /** Azione da eseguire al secondo tocco. Se restituisce { error } viene mostrato un messaggio. */
  action: () => Promise<{ error?: string } | undefined | void>
  icon?: React.ReactNode
  label: string
  confirmLabel: string
}

// Quanto resta attiva la richiesta di conferma prima di tornare normale
const CONFIRM_MS = 4000

/**
 * Pulsante per azioni da non fare per sbaglio: il primo tocco chiede conferma,
 * il secondo esegue. Niente finestre del browser, che sul telefono sono scomode.
 */
export function ConfirmButton({ action, icon, label, confirmLabel, disabled, ...props }: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS)
    return () => clearTimeout(timer)
  }, [confirming])

  function handleClick() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    startTransition(async () => {
      const result = await action()
      if (result && result.error) toast.error(result.error)
    })
  }

  return (
    <Button variant="destructive" {...props} onClick={handleClick} disabled={disabled || pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : icon}
      {confirming ? confirmLabel : label}
    </Button>
  )
}
