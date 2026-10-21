import Link from "next/link"

import { Button } from "@/components/ui/button"
import { pendingRequestCount } from "@/features/admin/queries"
import { isAdminEmail } from "@/lib/admin"
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
  const isAdmin = isAdminEmail(email)
  // Solo per gli admin: pallino sul menu se qualcuno aspetta di entrare
  const pending = isAdmin ? await pendingRequestCount() : 0
  return (
    <>
      {/* Solo per chi ha fatto l'accesso: aggiorna lo stato online */}
      <PresenceHeartbeat />
      <UserMenuDropdown user={{ name, email, image }} isAdmin={isAdmin} pendingRequests={pending} />
    </>
  )
}
