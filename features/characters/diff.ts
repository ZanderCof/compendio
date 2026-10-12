import { ABILITIES, SKILLS } from "./rules"
import type { CharacterSheet } from "./types"

// Confronto tra due schede: serve alle proposte del master.
// Gli oggetti si confrontano campo per campo, le liste (inventario, incantesimi...) come blocco unico.

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

export type SheetChange = {
  /** Percorso del campo, es. "hitPoints.current" o "abilities.str" */
  path: string
  /** Valore prima della modifica: all'accettazione deve essere ancora quello */
  from: Json
  to: Json
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

/** Uguaglianza profonda che ignora l'ordine delle chiavi (il database può riordinarle). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  // Un campo assente e un campo a null valgono uguale
  if ((a === undefined || a === null) && (b === undefined || b === null)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].every((key) => deepEqual(a[key], b[key]))
  }
  return false
}

const toJson = (value: unknown): Json => (value === undefined ? null : (JSON.parse(JSON.stringify(value)) as Json))

export function diffSheets(before: CharacterSheet, after: CharacterSheet): SheetChange[] {
  const changes: SheetChange[] = []

  function walk(a: unknown, b: unknown, path: string[]) {
    if (deepEqual(a, b)) return
    // Si scende dentro gli oggetti, tranne quando uno dei due manca (es. incantesimi aggiunti da zero)
    if (isPlainObject(a) && isPlainObject(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)])
      for (const key of [...keys].sort()) walk(a[key], b[key], [...path, key])
      return
    }
    changes.push({ path: path.join("."), from: toJson(a), to: toJson(b) })
  }

  walk(before, after, [])
  return changes
}

function getAt(obj: unknown, path: string[]): unknown {
  return path.reduce<unknown>((cur, key) => (isPlainObject(cur) ? cur[key] : undefined), obj)
}

function setAt(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  const [key, ...rest] = path
  const copy = { ...obj }
  if (rest.length === 0) {
    // null = campo da togliere (i campi facoltativi non accettano null)
    if (value === null) delete copy[key]
    else copy[key] = value
  } else {
    copy[key] = setAt(isPlainObject(obj[key]) ? obj[key] : {}, rest, value)
  }
  return copy
}

/**
 * Applica le modifiche alla scheda attuale.
 * Se un campo non vale più `from` (il giocatore l'ha cambiato nel frattempo) restituisce i conflitti.
 */
export function applyChanges(
  sheet: CharacterSheet,
  changes: SheetChange[]
): { ok: true; sheet: unknown } | { ok: false; conflicts: SheetChange[] } {
  const conflicts = changes.filter((change) => !deepEqual(getAt(sheet, change.path.split(".")), change.from))
  if (conflicts.length > 0) return { ok: false, conflicts }

  const result = changes.reduce<Record<string, unknown>>(
    (acc, change) => setAt(acc, change.path.split("."), change.to),
    sheet as unknown as Record<string, unknown>
  )
  return { ok: true, sheet: result }
}

// ─── Descrizione leggibile delle modifiche ──────────────────────

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  player: "Giocatore",
  race: "Razza",
  className: "Classe",
  subclass: "Sottoclasse",
  level: "Livello",
  background: "Background",
  alignment: "Allineamento",
  experience: "Punti esperienza",
  savingThrows: "Tiri salvezza",
  armorClass: "Classe Armatura",
  speed: "Velocità",
  "hitPoints.current": "PF attuali",
  "hitPoints.max": "PF massimi",
  "hitPoints.temp": "PF temporanei",
  "hitDice.die": "Dado vita",
  "hitDice.total": "Dadi vita totali",
  "hitDice.used": "Dadi vita usati",
  "deathSaves.successes": "Successi contro la morte",
  "deathSaves.failures": "Fallimenti contro la morte",
  inspiration: "Ispirazione",
  attacks: "Attacchi",
  spellcasting: "Incantesimi",
  "spellcasting.ability": "Caratteristica da incantatore",
  "spellcasting.slots": "Slot incantesimo",
  "spellcasting.spells": "Incantesimi conosciuti",
  equipment: "Equipaggiamento",
  "currency.cp": "Monete di rame",
  "currency.sp": "Monete d'argento",
  "currency.ep": "Monete di electrum",
  "currency.gp": "Monete d'oro",
  "currency.pp": "Monete di platino",
  features: "Privilegi e tratti",
  "proficiencies.armor": "Competenze: armature",
  "proficiencies.weapons": "Competenze: armi",
  "proficiencies.tools": "Competenze: strumenti",
  "proficiencies.languages": "Lingue",
  "personality.traits": "Tratti",
  "personality.ideals": "Ideali",
  "personality.bonds": "Legami",
  "personality.flaws": "Difetti",
  backstory: "Storia",
}

const PROFICIENCY_LABELS: Record<string, string> = {
  none: "nessuna",
  proficient: "competente",
  expertise: "maestria",
}

export function changeLabel(path: string): string {
  const [head, key] = path.split(".")
  if (head === "abilities") return ABILITIES.find((a) => a.key === key)?.label ?? path
  if (head === "skills") return `Abilità: ${SKILLS.find((s) => s.key === key)?.label ?? key}`
  return FIELD_LABELS[path] ?? path
}

const abilityShort = (key: Json) => ABILITIES.find((a) => a.key === key)?.short ?? String(key)

const named = (items: Json[]) =>
  items.map((item) => (isPlainObject(item) && typeof item.name === "string" ? item.name : JSON.stringify(item)))

/** Valore leggibile, es. true → "sì", ["wis","cha"] → "SAG, CAR". */
export function formatValue(path: string, value: Json): string {
  if (value === null || value === "") return "—"
  if (typeof value === "boolean") return value ? "sì" : "no"
  if (path.startsWith("skills.")) return PROFICIENCY_LABELS[String(value)] ?? String(value)
  if (path === "savingThrows" && Array.isArray(value)) return value.map(abilityShort).join(", ") || "nessuno"
  if (path === "spellcasting.slots" && Array.isArray(value)) {
    return value
      .map((slot) => (isPlainObject(slot) ? `${slot.level}°: ${Number(slot.total) - Number(slot.used)}/${slot.total}` : ""))
      .join(" · ")
  }
  if (Array.isArray(value)) return value.length === 0 ? "nessuno" : named(value).join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/** Per le liste di oggetti con nome: cosa è stato aggiunto e cosa tolto, invece dell'elenco intero. */
export function describeListChange(change: SheetChange): { added: string[]; removed: string[] } | null {
  if (!Array.isArray(change.from) || !Array.isArray(change.to)) return null
  const before = named(change.from)
  const after = named(change.to)
  const added = after.filter((name) => !before.includes(name))
  const removed = before.filter((name) => !after.includes(name))
  return added.length || removed.length ? { added, removed } : null
}
