"use client"

import { createContext, use, useEffect, useMemo, useReducer, useState } from "react"

import { characterSheetSchema } from "@/features/characters/schema"
import { characterReducer, type CharacterAction } from "@/features/characters/state"
import type { Character } from "@/features/characters/types"

type CharacterContextValue = {
  character: Character
  dispatch: (action: CharacterAction) => void
  /** Modalità modifica: sblocca i valori che in partita di solito non cambiano. */
  editing: boolean
  setEditing: (editing: boolean) => void
  /** Scarta le modifiche locali e torna ai dati originali. */
  reset: () => void
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

// Finché non c'è il database le modifiche restano nel browser.
// Quando ci sarà, qui il salvataggio diventerà una Server Action.
const storageKey = (id: string) => `compendio:character:${id}`

function loadSaved(initial: Character): Character | null {
  try {
    const raw = localStorage.getItem(storageKey(initial.id))
    if (!raw) return null
    const parsed = characterSheetSchema.safeParse(JSON.parse(raw))
    return parsed.success ? { ...parsed.data, id: initial.id } : null
  } catch {
    return null
  }
}

export function CharacterProvider({
  initial,
  children,
}: {
  initial: Character
  children: React.ReactNode
}) {
  const [character, dispatch] = useReducer(characterReducer, initial)
  const [editing, setEditing] = useState(false)

  // Al primo render usa i dati del server (uguali per server e browser), poi carica le modifiche salvate
  useEffect(() => {
    const saved = loadSaved(initial)
    if (saved) dispatch({ type: "replace", character: saved })
  }, [initial])

  useEffect(() => {
    // Finché la scheda è quella iniziale non si salva nulla: altrimenti, al primo render,
    // i dati iniziali sovrascriverebbero quelli salvati prima ancora di caricarli
    if (character === initial) return
    try {
      // L'id è già nella chiave: si salva solo la scheda, come farà il database
      const sheet: Partial<Character> = { ...character }
      delete sheet.id
      localStorage.setItem(storageKey(character.id), JSON.stringify(sheet))
    } catch {
      // Spazio pieno o storage bloccato: la scheda funziona lo stesso, senza salvare
    }
  }, [character, initial])

  const value = useMemo<CharacterContextValue>(
    () => ({
      character,
      dispatch,
      editing,
      setEditing,
      reset: () => {
        try {
          localStorage.removeItem(storageKey(initial.id))
        } catch {}
        dispatch({ type: "replace", character: initial })
      },
    }),
    [character, editing, initial]
  )

  return <CharacterContext value={value}>{children}</CharacterContext>
}

export function useCharacter() {
  const context = use(CharacterContext)
  if (!context) throw new Error("useCharacter va usato dentro <CharacterProvider>")
  return context
}
