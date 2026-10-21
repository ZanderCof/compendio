"use client"

import { useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { LogOut, Monitor, Moon, ShieldCheck, Sun, UserRound } from "lucide-react"

import { switchTheme, type ThemeChoice } from "@/components/theme/switchTheme"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/auth-client"
import { initials } from "@/lib/initials"

type UserMenuDropdownProps = {
  user: { name: string; email: string; image?: string | null }
  /** Mostra la voce "Amministrazione": la pagina resta comunque protetta sul server */
  isAdmin?: boolean
  /** Richieste di accesso in attesa (solo admin) */
  pendingRequests?: number
}

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Chiaro", icon: Sun },
  { value: "dark", label: "Scuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
]

/** Menu dell'avatar: profilo, tema e uscita. */
export function UserMenuDropdown({ user, isAdmin, pendingRequests = 0 }: UserMenuDropdownProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const triggerRef = useRef<HTMLButtonElement>(null)

  async function handleSignOut() {
    await signOut()
    router.push("/")
    router.refresh()
  }

  /** Il cerchio del nuovo tema parte dall'avatar. */
  function changeTheme(next: string) {
    const rect = triggerRef.current?.getBoundingClientRect()
    switchTheme(next as ThemeChoice, setTheme, rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={triggerRef}
        className="relative rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Menu utente"
      >
        <Avatar className="ring-2 ring-primary/40 transition-transform hover:scale-105">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="bg-primary text-primary-foreground">{initials(user.name)}</AvatarFallback>
        </Avatar>
        {pendingRequests > 0 && (
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-aqua ring-2 ring-background">
            <span className="sr-only">Richieste di accesso in attesa</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound />
            Il tuo profilo
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href={pendingRequests > 0 ? "/admin?scheda=richieste" : "/admin"}>
              <ShieldCheck />
              Amministrazione
              {pendingRequests > 0 && (
                <span className="ml-auto min-w-5 rounded-full bg-primary px-1.5 text-center text-xs leading-5 text-primary-foreground">
                  {pendingRequests}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={changeTheme}>
          {THEMES.map((t) => (
            <DropdownMenuRadioItem key={t.value} value={t.value}>
              <t.icon />
              {t.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
