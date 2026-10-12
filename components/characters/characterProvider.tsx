"use client"

import { createContext, use, useCallback, useEffect, useMemo, useReducer, useState } from "react"

import { saveCharacterSheet } from "@/features/characters/actions"
import type { CharacterAccess } from "@/features/characters/queries"
import { characterReducer, type CharacterAction } from "@/features/characters/state"
import type { Character, CharacterSheet } from "@/features/characters/types"
import type { EditRequestView } from "@/features/editRequests/queries"

export type SaveStatus = "saved" | "saving" | "error"

type CharacterContextValue = {
  character: Character
  /** Scheda come arrivata dal server: è la base da cui il master prepara una proposta. */
  initial: Character
  access: CharacterAccess
  dispatch: (action: CharacterAction) => void
  /** Vero quando non si può toccare nulla: il master che guarda senza preparare una proposta. */
  readOnly: boolean
  /** Modalità modifica: sblocca i valori che in partita di solito non cambiano. */
  editing: boolean
  setEditing: (editing: boolean) => void
  saveStatus: SaveStatus
  /** Sostituisce la scheda con quella del server (es. dopo aver accettato una proposta) senza risalvarla. */
  replaceFromServer: (sheet: CharacterSheet) => void

  // Proposte del master
  proposing: boolean
  startProposal: () => void
  /** Scarta la bozza e torna alla scheda originale. */
  endProposal: () => void
  requests: EditRequestView[]
  setRequests: (requests: EditRequestView[]) => void
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

// Aspetta una breve pausa tra le modifiche prima di salvare: cinque tocchi su "+" = un salvataggio
const SAVE_DELAY_MS = 700

export function CharacterProvider({
  initial,
  access,
  initialRequests,
  children,
}: {
  initial: Character
  access: CharacterAccess
  initialRequests: EditRequestView[]
  children: React.ReactNode
}) {
  const [character, rawDispatch] = useReducer(characterReducer, initial)
  const [editing, setEditing] = useState(false)
  // Ultima versione confermata dal database: se è diversa da quella a schermo, c'è un salvataggio in sospeso
  const [saved, setSaved] = useState(initial)
  const [failed, setFailed] = useState(false)
  const [proposing, setProposing] = useState(false)
  const [requests, setRequests] = useState(initialRequests)

  const isOwner = access === "owner"
  const readOnly = !isOwner && !proposing
  // Solo il proprietario salva: la bozza del master resta nel browser finché non la invia
  const dirty = isOwner && character !== saved

  // Salvataggio automatico sul database dopo ogni modifica
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(async () => {
      const { id, ...sheet } = character
      const result = await saveCharacterSheet(id, sheet)
      setFailed(!result.ok)
      if (result.ok) setSaved(character)
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [character, dirty])

  // Avvisa prima di chiudere la pagina se una modifica non è ancora arrivata al database
  useEffect(() => {
    if (!dirty && !proposing) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, proposing])

  const replaceFromServer = useCallback(
    (sheet: CharacterSheet) => {
      const next = { ...sheet, id: initial.id }
      rawDispatch({ type: "replace", character: next })
      setSaved(next)
      setFailed(false)
    },
    [initial.id]
  )

  const saveStatus: SaveStatus = failed ? "error" : dirty ? "saving" : "saved"

  const value = useMemo<CharacterContextValue>(
    () => ({
      character,
      initial,
      access,
      // In sola lettura le azioni vengono ignorate
      dispatch: readOnly ? () => {} : rawDispatch,
      readOnly,
      editing: editing && !readOnly,
      setEditing,
      saveStatus,
      replaceFromServer,
      proposing,
      startProposal: () => {
        setProposing(true)
        setEditing(true)
      },
      endProposal: () => {
        rawDispatch({ type: "replace", character: initial })
        setProposing(false)
        setEditing(false)
      },
      requests,
      setRequests,
    }),
    [character, initial, access, editing, readOnly, saveStatus, replaceFromServer, proposing, requests]
  )

  return <CharacterContext value={value}>{children}</CharacterContext>
}

export function useCharacter() {
  const context = use(CharacterContext)
  if (!context) throw new Error("useCharacter va usato dentro <CharacterProvider>")
  return context
}
