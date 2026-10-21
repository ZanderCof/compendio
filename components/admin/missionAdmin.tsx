"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { Ban, LoaderCircle, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CLASSES, RACES } from "@/features/characters/classes"
import { ABILITIES } from "@/features/characters/rules"
import { closeMission, createMission, deleteMission } from "@/features/missions/admin"
import { DIAMOND_GAP_DAYS, MISSION_TIERS, TIERS, type MissionTier } from "@/features/missions/tiers"
import { TIER_STYLES } from "@/components/missions/tierBadge"
import { cn } from "@/lib/utils"

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

const DURATIONS = [
  { hours: 4, label: "4 ore" },
  { hours: 8, label: "8 ore" },
  { hours: 12, label: "12 ore" },
  { hours: 24, label: "1 giorno" },
  { hours: 48, label: "2 giorni" },
  { hours: 72, label: "3 giorni" },
  { hours: 120, label: "5 giorni" },
  { hours: 168, label: "7 giorni" },
]

const durationLabel = (hours: number) => DURATIONS.find((d) => d.hours === hours)?.label ?? `${hours} ore`

/**
 * Lunedì e domenica della settimana corrente in Italia, nel formato dei campi data.
 * Fuso fisso: server e browser calcolano gli stessi giorni (niente differenze all'idratazione).
 */
function currentWeek() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date())
  const day = new Date(`${today}T12:00:00Z`)
  const monday = new Date(day)
  monday.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(monday), end: iso(sunday) }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs tracking-widest text-muted-foreground uppercase">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

/** Chip selezionabili (checkbox nascoste): nessuna scelta = tutte ammesse. */
function ChipChecks({ name, options }: { name: string; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <label key={option} className="cursor-pointer">
          <input type="checkbox" name={name} value={option} className="peer sr-only" />
          <span className="block rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
            {option}
          </span>
        </label>
      ))}
    </div>
  )
}

/** Form dell'admin per una nuova missione settimanale. */
export function CreateMissionForm() {
  const [state, action, pending] = useActionState(createMission, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  // Le date predefinite dipendono dal giorno (calcolate con il fuso italiano)
  const [week] = useState(currentWeek)
  // Il livello scelto decide i valori predefiniti mostrati nei campi vuoti
  const [tier, setTier] = useState<MissionTier>("BRONZE")
  const defaults = TIERS[tier].defaults

  useEffect(() => {
    if (!state?.created) return
    toast.success("Missione creata")
    // Il reset riporta il livello al bronzo: onReset aggiorna anche i valori predefiniti mostrati
    formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} onReset={() => setTier("BRONZE")} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs tracking-widest text-muted-foreground uppercase">Livello della missione</legend>
        <div className="flex flex-wrap gap-1.5">
          {MISSION_TIERS.map((t) => (
            <label key={t} className="cursor-pointer">
              <input
                type="radio"
                name="tier"
                value={t}
                defaultChecked={t === "BRONZE"}
                onChange={() => setTier(t)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "font-display block rounded-full border px-3 py-1 tracking-wide opacity-55 transition-all peer-checked:scale-105 peer-checked:opacity-100 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                  TIER_STYLES[t].badge
                )}
              >
                {TIERS[t].label}
              </span>
            </label>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {tier === "DIAMOND"
            ? `Rarissima: tra due missioni diamante devono passare almeno ${DIAMOND_GAP_DAYS} giorni.`
            : "I campi lasciati vuoti prendono i valori del livello: scrivi un numero per cambiarli."}
        </span>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Titolo">
          <Input name="title" required maxLength={80} placeholder="Es. Lupi alla fattoria dei Brandybuck" />
        </Field>
        <Field label="EXP al profilo" hint={`Vuoto = ${defaults.xpReward}. Metà se la prova fallisce`}>
          <Input name="xpReward" type="number" min={0} max={10000} placeholder={String(defaults.xpReward)} />
        </Field>
      </div>

      <Field label="Descrizione">
        <textarea
          name="description"
          required
          maxLength={1000}
          rows={3}
          placeholder="Cosa deve fare il personaggio, in poche righe"
          className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Oggetto bonus (facoltativo)" hint="Finisce nell'equipaggiamento se la prova riesce">
          <Input name="rewardItem" maxLength={80} placeholder="Es. Pozione di guarigione" />
        </Field>
        <Field label="Monete d'oro (facoltative)" hint="Si aggiungono alle monete se la prova riesce">
          <Input name="rewardGold" type="number" min={0} max={100000} defaultValue={0} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Inizio">
          <Input name="startsOn" type="date" defaultValue={week.start} required />
        </Field>
        <Field label="Fine (compresa)">
          <Input name="endsOn" type="date" defaultValue={week.end} required />
        </Field>
        <Field label="Durata">
          <select key={tier} name="durationHours" defaultValue="" className={fieldClass}>
            <option value="">Predefinita ({durationLabel(defaults.durationHours)})</option>
            {DURATIONS.map((d) => (
              <option key={d.hours} value={d.hours}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Livello minimo">
          <Input name="minLevel" type="number" min={1} max={20} placeholder={String(defaults.minLevel)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prova al ritorno">
          <select name="ability" defaultValue="dex" className={fieldClass}>
            {ABILITIES.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Classe Difficoltà" hint={`Vuoto = ${defaults.dc}. d20 + modificatore deve arrivarci`}>
          <Input name="dc" type="number" min={1} max={40} placeholder={String(defaults.dc)} />
        </Field>
      </div>

      <Field label="Classi ammesse" hint="Nessuna selezionata = tutte">
        <ChipChecks name="allowedClasses" options={CLASSES.map((c) => c.name)} />
      </Field>
      <Field label="Razze ammesse" hint="Nessuna selezionata = tutte">
        <ChipChecks name="allowedRaces" options={RACES} />
      </Field>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-end">
        {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
        Crea missione
      </Button>
    </form>
  )
}

/** Chiudi in anticipo (chi è via torna lo stesso) oppure elimina se nessuno l'ha ancora fatta. */
export function MissionAdminActions({ id, title, closed, runs }: { id: string; title: string; closed: boolean; runs: number }) {
  const [pending, startTransition] = useTransition()

  function run(kind: "close" | "delete") {
    const question =
      kind === "close"
        ? `Chiudere "${title}"? Nessuno potrà più partire; chi è già in viaggio torna normalmente.`
        : `Eliminare "${title}"? Non si può annullare.`
    if (!confirm(question)) return
    startTransition(async () => {
      const result = kind === "close" ? await closeMission(id) : await deleteMission(id)
      if (result?.error) toast.error(result.error)
      else toast.success(kind === "close" ? "Missione chiusa" : "Missione eliminata")
    })
  }

  return (
    <div className="flex gap-1">
      {!closed && (
        <Button size="sm" variant="ghost" onClick={() => run("close")} disabled={pending}>
          <Ban />
          Chiudi
        </Button>
      )}
      {runs === 0 && (
        <Button
          size="sm"
          variant="ghost"
          className={cn("text-destructive hover:text-destructive")}
          onClick={() => run("delete")}
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
          Elimina
        </Button>
      )}
    </div>
  )
}
