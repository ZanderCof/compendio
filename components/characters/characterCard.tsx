import Link from "next/link"
import { Heart, Shield } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { CharacterSummary } from "@/features/characters/queries"
import { cn } from "@/lib/utils"

/** Riquadro riassuntivo di un personaggio, usato nelle liste. Con `href` diventa un link alla scheda. */
export function CharacterCard({
  character,
  href,
  showOwner = false,
}: {
  character: CharacterSummary
  href?: string
  showOwner?: boolean
}) {
  const { hitPoints } = character
  const hpPercent = Math.max(0, Math.min(100, Math.round((hitPoints.current / hitPoints.max) * 100)))
  const initials = character.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-plum to-violet text-lg text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg leading-tight tracking-wide">{character.name}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {character.race} · {character.className} {character.level}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1" title="Punti ferita">
          <Heart className={cn("size-4", hitPoints.current === 0 ? "text-destructive" : "text-plum")} />
          <span className="tabular-nums">
            {hitPoints.current}/{hitPoints.max}
          </span>
        </span>
        <span className="flex items-center gap-1" title="Classe armatura">
          <Shield className="size-4 text-violet" />
          {character.armorClass}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className={cn("h-full rounded-full", hitPoints.current === 0 ? "bg-destructive" : "bg-primary")}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {(showOwner || character.campaign) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {showOwner && <Badge variant="secondary">Giocatore: {character.ownerName}</Badge>}
          {character.campaign && !showOwner && <Badge variant="outline">{character.campaign.name}</Badge>}
        </div>
      )}
    </>
  )

  const className = "block rounded-xl border bg-card p-4 transition-colors"
  return href ? (
    <Link href={href} className={cn(className, "hover:border-primary/50 hover:bg-secondary/30")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}
