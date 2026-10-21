import { redirect } from "next/navigation"

// Gli inviti ora stanno nella pagina di amministrazione
export default function AdminInvitesPage() {
  redirect("/admin?scheda=inviti")
}
