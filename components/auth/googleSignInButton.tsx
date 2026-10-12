"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { signIn } from "@/lib/auth-client"

/** Accetta solo percorsi interni, per evitare redirect verso altri siti. */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/"
}

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    const next = safeNext(new URLSearchParams(window.location.search).get("next"))
    const { error } = await signIn.social({ provider: "google", callbackURL: next })
    if (error) {
      toast.error("Accesso non riuscito", { description: error.message })
      setPending(false)
    }
  }

  return (
    <Button size="lg" className="w-full" onClick={handleClick} disabled={pending}>
      <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.08 1.08-2.76 2.26-6.11 2.26-5.2 0-9.27-4.19-9.27-9.4s4.07-9.4 9.27-9.4c2.8 0 4.85 1.1 6.36 2.53l2.31-2.31C19.2 1.98 16.4.5 12.48.5 6.02.5.6 5.76.6 12.24s5.42 11.74 11.88 11.74c3.5 0 6.13-1.15 8.19-3.3 2.12-2.12 2.78-5.1 2.78-7.5 0-.74-.06-1.43-.17-2.01H12.48z" />
      </svg>
      {pending ? "Reindirizzamento…" : "Accedi con Google"}
    </Button>
  )
}
