"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { LogOut, Monitor, Moon, Sun } from "lucide-react"

import { switchTheme, type ThemeChoice } from "@/components/theme/switchTheme"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/auth-client"

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Chiaro", icon: Sun },
  { value: "dark", label: "Scuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
]

/** Scelta del tema: tre pulsanti grandi, il cerchio del nuovo tema parte da quello toccato. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={theme === t.value}
          onClick={(e) => switchTheme(t.value, setTheme, { x: e.clientX, y: e.clientY })}
          className={cn(
            "font-display flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 text-sm tracking-wide transition-colors",
            theme === t.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
          )}
        >
          <t.icon className="size-5" />
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function SignOutButton() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await signOut()
        router.push("/")
        router.refresh()
      }}
    >
      <LogOut />
      Esci
    </Button>
  )
}
