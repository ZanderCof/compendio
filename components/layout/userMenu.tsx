import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/session"
import { PresenceHeartbeat } from "@/components/presence/presenceHeartbeat"
import { ThemeToggle } from "@/components/theme/themeToggle"
import { UserMenuDropdown } from "./userMenuDropdown"

/** Avatar con menu se l'utente ha fatto l'accesso, altrimenti il pulsante "Accedi". */
export async function UserMenu() {
  const session = await getSession()

  if (!session) {
    // Senza accesso il tema si cambia con il pulsante sole/luna; dopo l'accesso sta nel menu dell'avatar
    return (
      <>
        <ThemeToggle />
        <Button asChild>
          <Link href="/login">Accedi</Link>
        </Button>
      </>
    )
  }

  const { name, email, image } = session.user
  return (
    <>
      {/* Solo per chi ha fatto l'accesso: aggiorna lo stato online */}
      <PresenceHeartbeat />
      <UserMenuDropdown user={{ name, email, image }} />
    </>
  )
}
