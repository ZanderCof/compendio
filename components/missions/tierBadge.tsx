import { Gem, Medal } from "lucide-react"

import { TIERS, type MissionTier } from "@/features/missions/tiers"
import { cn } from "@/lib/utils"

/** Colori di ogni livello: metallo per i primi quattro, gradiente della palette per il diamante. */
export const TIER_STYLES: Record<MissionTier, { badge: string; card: string }> = {
  BRONZE: {
    badge: "bg-linear-to-r from-amber-700 to-orange-600 text-white",
    card: "border-amber-700/40",
  },
  SILVER: {
    badge: "bg-linear-to-r from-slate-400 to-slate-300 text-slate-900",
    card: "border-slate-400/50",
  },
  GOLD: {
    badge: "bg-linear-to-r from-yellow-500 to-amber-300 text-amber-950",
    card: "border-yellow-500/50",
  },
  PLATINUM: {
    badge: "bg-linear-to-r from-cyan-200 to-slate-200 text-slate-900 ring-1 ring-cyan-300/60",
    card: "border-cyan-300/60",
  },
  DIAMOND: {
    badge: "banner-animated text-white shadow-md shadow-aqua/40",
    card: "border-glow border-transparent",
  },
}

export function TierBadge({ tier, className }: { tier: MissionTier; className?: string }) {
  const Icon = tier === "DIAMOND" ? Gem : Medal
  return (
    <span
      className={cn(
        "font-display inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm tracking-wide",
        TIER_STYLES[tier].badge,
        className
      )}
    >
      <Icon className="size-3.5" />
      {TIERS[tier].label}
    </span>
  )
}
