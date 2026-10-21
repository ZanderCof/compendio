"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { GoogleSignInButton } from "@/components/auth/googleSignInButton"
import { acceptBetaInvite } from "@/features/invites/actions"

/** "Accedi con Google" dall'invito: prima il server ricontrolla il codice e lo salva nel cookie. */
export function InviteSignIn({ code }: { code: string }) {
  const router = useRouter()

  return (
    <GoogleSignInButton
      callbackURL="/characters"
      beforeSignIn={async () => {
        const ok = await acceptBetaInvite(code)
        if (!ok) {
          toast.error("Questo invito non è più valido", { description: "Chiedi un nuovo link a chi ti ha invitato." })
          router.refresh()
        }
        return ok
      }}
    />
  )
}
