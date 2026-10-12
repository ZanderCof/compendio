"use client"

import { createContext, use, useEffect, useMemo, useReducer, useState } from "react"

import { saveCharacterSheet } from "@/features/characters/actions"
import type { CharacterAccess } from "@/features/characters/queries"
import { characterReducer, type CharacterAction } from "@/features/characters/state"
import type { Character } from "@/features/characters/types"

export type SaveStatus = "saved" | "saving" | "error"

type CharacterContextValue = {
  character: Character
  dispatch: (action: CharacterAction) => void
  /** Solo il proprietario modifica: il master per ora vede la scheda in sola lettura. */
  readOnly: boolean
  /** Modalità modifica: sblocca i valori che in partita di solito non cambiano. */
  editing: boolean
  setEditing: (editing: boolean) => void
  saveStatus: SaveStatus
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

// Aspetta una breve pausa tra le modifiche prima di salvare: cinque tocchi su "+" = un salvataggio
const SAVE_DELAY_MS = 700

export function CharacterProvider({
  initial,
  access,
  children,
}: {
  initial: Character
  access: CharacterAccess
  children: React.ReactNode
}) {
  const [character, rawDispatch] = useReducer(characterReducer, initial)
  const [editing, setEditing] = useState(false)
  // Ultima versione confermata dal database: se è diversa da quella a schermo, c'è un salvataggio in sospeso
  const [saved, setSaved] = useState(initial)
  const [failed, setFailed] = useState(false)
  const readOnly = access !== "owner"
  const dirty = character !== saved

  // Salvataggio automatico sul database dopo ogni modifica
  useEffect(() => {
    if (!dirty || readOnly) return
    const timer = setTimeout(async () => {
      const { id, ...sheet } = character
      const result = await saveCharacterSheet(id, sheet)
      setFailed(!result.ok)
      if (result.ok) setSaved(character)
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [character, dirty, readOnly])

  // Avvisa prima di chiudere la pagina se una modifica non è ancora arrivata al database
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const saveStatus: SaveStatus = failed ? "error" : dirty ? "saving" : "saved"

  const value = useMemo<CharacterContextValue>(
    () => ({
      character,
      // In sola lettura le azioni vengono ignorate
      dispatch: readOnly ? () => {} : rawDispatch,
      readOnly,
      editing: editing && !readOnly,
      setEditing,
      saveStatus,
    }),
    [character, editing, readOnly, saveStatus]
  )

  return <CharacterContext value={value}>{children}</CharacterContext>
}

export function useCharacter() {
  const context = use(CharacterContext)
  if (!context) throw new Error("useCharacter va usato dentro <CharacterProvider>")
  return context
}
