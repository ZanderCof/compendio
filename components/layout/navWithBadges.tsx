import { campaignsAwaitingVote } from "@/features/polls/queries"
import { getSession } from "@/lib/session"
import { MainNav } from "./mainNav"

/** Link della navbar con i pallini di avviso dell'utente (es. date da votare). */
export async function NavWithBadges() {
  const session = await getSession()
  const awaiting = session ? await campaignsAwaitingVote(session.user.id) : []
  return <MainNav badges={{ "/campaigns": awaiting.length }} />
}
