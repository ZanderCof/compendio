import Link from "next/link"
import { CalendarClock, Clock, Coins, Dices, Gem, House, Plus, ScrollText, Sparkles, Swords, Tent } from "lucide-react"

import { TIER_STYLES, TierBadge } from "@/components/missions/tierBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { abilityLabel } from "@/features/characters/rules"
import type { Ability } from "@/features/characters/types"
import type { BoardCharacter, BoardMission } from "@/features/missions/queries"
import { cn } from "@/lib/utils"
import { ReturnsIn, SendOnMission } from "./missionControls"

const dayFormat = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" })

function duration(hours: number) {
  if (hours % 24 === 0) return hours === 24 ? "1 giorno" : `${hours / 24} giorni`
  return hours === 1 ? "1 ora" : `${hours} ore`
}

function CharacterStatus({ character }: { character: BoardCharacter }) {
  if (character.away) {
    return (
      <Badge className="bg-violet text-primary-foreground">
        <Tent />
        <ReturnsIn at={character.away.returnsAt} />
      </Badge>
    )
  }
  if (character.campaignName) {
    return (
      <Badge variant="secondary">
        <Swords />
        In campagna
      </Badge>
    )
  }
  return (
    <Badge className="bg-aqua text-foreground">
      <House />A casa
    </Badge>
  )
}

/** Una missione della settimana: descrizione, prova, requisiti, ricompense e "Manda in missione". */
function MissionItem({ mission, characters }: { mission: BoardMission; characters: BoardCharacter[] }) {
  const requirements = [
    mission.minLevel > 1 && `Livello ${mission.minLevel}+`,
    mission.allowedClasses.length > 0 && mission.allowedClasses.join(", "),
    mission.allowedRaces.length > 0 && mission.allowedRaces.join(", "),
  ].filter(Boolean)

  return (
    <article className={cn("relative flex flex-col gap-3 rounded-xl border-2 p-4", TIER_STYLES[mission.tier].card)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <TierBadge tier={mission.tier} className="mb-1" />
          <h3 className="text-2xl leading-tight tracking-wide">{mission.title}</h3>
          <p className="text-xs text-muted-foreground">Fino a {dayFormat.format(new Date(mission.endsAt))}</p>
        </div>
        <SendOnMission
          missionId={mission.id}
          missionTitle={mission.title}
          candidates={mission.candidates.map((c) => ({
            id: c.characterId,
            name: characters.find((ch) => ch.id === c.characterId)?.name ?? "Personaggio",
            problem: c.problem,
          }))}
        />
      </div>
      <p className="text-sm whitespace-pre-line text-muted-foreground">{mission.description}</p>
      <ul className="flex flex-wrap gap-1.5 text-xs">
        <li className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">
          <Sparkles className="size-3" />+{mission.xpReward} EXP
        </li>
        {mission.rewardItem && (
          <li className="flex items-center gap-1 rounded-full bg-aqua/20 px-2.5 py-0.5">
            <Gem className="size-3" />
            {mission.rewardItem}
          </li>
        )}
        {mission.rewardGold > 0 && (
          <li className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5">
            <Coins className="size-3" />
            {mission.rewardGold} mo
          </li>
        )}
        <li className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-muted-foreground">
          <Clock className="size-3" />
          {duration(mission.durationHours)}
        </li>
        <li className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-muted-foreground">
          <Dices className="size-3" />
          {abilityLabel(mission.ability as Ability)} CD {mission.dc}
        </li>
        {requirements.map((r) => (
          <li key={String(r)} className="rounded-full border border-dashed px-2.5 py-0.5 text-muted-foreground">
            {r}
          </li>
        ))}
      </ul>
    </article>
  )
}

/**
 * Missioni settimanali: i tuoi personaggi abilitati con il loro stato e le missioni aperte questa settimana.
 * Al ritorno il server tira la prova: riuscita = tutta l'EXP e le ricompense, fallita = metà EXP.
 */
export function MissionsCard({ missions, characters }: { missions: BoardMission[]; characters: BoardCharacter[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="flex items-center gap-2 text-3xl leading-tight tracking-wide">
          <ScrollText className="size-6 text-violet" />
          Missioni settimanali
        </h2>
        <p className="text-sm text-muted-foreground">
          Quando un personaggio è a casa può partire per una missione a settimana. Al ritorno si tira la prova: se
          riesce prende tutto, se fallisce metà EXP.
        </p>
      </div>

      {characters.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center">
          <p>Nessun personaggio può andare in missione.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Quando crei un personaggio, spunta &quot;Può partecipare alle missioni settimanali&quot;. Si sceglie solo alla
            creazione.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/characters/new">
              <Plus />
              Nuovo personaggio
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {characters.map((character) => (
            <li key={character.id}>
              <Link
                href={`/characters/${character.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 transition-colors hover:border-primary/50 hover:bg-secondary/30"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{character.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {character.away
                      ? `In missione: ${character.away.missionTitle}`
                      : character.campaignName
                        ? `In campagna: ${character.campaignName}`
                        : character.doneThisWeek
                          ? "Missione della settimana già fatta"
                          : "Pronto a partire"}
                  </span>
                </span>
                <CharacterStatus character={character} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {missions.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-secondary/40 p-3 text-sm text-muted-foreground">
          <CalendarClock className="size-4 shrink-0 text-violet" />
          Nessuna missione aperta questa settimana. Torna a controllare presto.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs tracking-widest text-muted-foreground uppercase">Missioni di questa settimana</h3>
          {missions.map((mission) => (
            <MissionItem key={mission.id} mission={mission} characters={characters} />
          ))}
        </div>
      )}
    </section>
  )
}
