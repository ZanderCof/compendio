"use client"

import { createContext, use, useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

import { d20, parse, roll, type Dice, type RollResult } from "@/features/dice/dice"
import { rollForCharacter } from "@/features/rolls/actions"
import { RollToast } from "./rollToast"

export type Advantage = "normal" | "advantage" | "disadvantage"

export type LoggedRoll = RollResult & {
  id: string
  label: string
  at: number
  /** Valore del d20 tenuto, solo per i tiri da d20: serve per critici e tiri contro la morte. */
  natural: number | null
}

type DiceContextValue = {
  advantage: Advantage
  setAdvantage: (advantage: Advantage) => void
  /** Tiro di d20 + bonus. Usa vantaggio/svantaggio e poi torna a "normale". Null se il tiro non è riuscito. */
  rollD20: (label: string, bonus: number) => Promise<LoggedRoll | null>
  rollDice: (label: string, dice: Dice) => Promise<LoggedRoll | null>
  /** Tiro da notazione scritta (es. "8d6+3"). Se non è valida mostra un errore e restituisce null. */
  rollNotation: (label: string, text: string) => Promise<LoggedRoll | null>
  /** Vero se i tiri passano dal server e finiscono nel registro della campagna. */
  logged: boolean
  history: LoggedRoll[]
  clearHistory: () => void
}

const DiceContext = createContext<DiceContextValue | null>(null)

const HISTORY_LIMIT = 50

/**
 * Con `characterId` (personaggio in campagna) i dadi li tira il server, che li registra:
 * il master li vede e nessuno può barare. Senza, si tira nel browser.
 */
export function DiceProvider({
  characterId,
  children,
}: {
  characterId?: string
  children: React.ReactNode
}) {
  const [advantage, setAdvantage] = useState<Advantage>("normal")
  const [history, setHistory] = useState<LoggedRoll[]>([])

  const record = useCallback(
    async (label: string, dice: Dice): Promise<LoggedRoll | null> => {
      let result: RollResult
      if (characterId) {
        const response = await rollForCharacter(characterId, label, dice)
        if (!response.ok) {
          toast.error(response.error)
          return null
        }
        result = response.result
      } else {
        result = roll(dice)
      }

      const isD20 = dice.sides === 20 && result.kept.length === 1
      const logged: LoggedRoll = {
        ...result,
        id: crypto.randomUUID(),
        label,
        at: Date.now(),
        natural: isD20 ? result.kept[0] : null,
      }
      setHistory((prev) => [logged, ...prev].slice(0, HISTORY_LIMIT))
      toast.custom(() => <RollToast roll={logged} />, { duration: 5000 })
      return logged
    },
    [characterId]
  )

  const value = useMemo<DiceContextValue>(
    () => ({
      advantage,
      setAdvantage,
      rollD20: (label, bonus) => {
        // Il vantaggio vale per un solo tiro: si azzera subito, senza aspettare il server
        setAdvantage("normal")
        return record(label, d20(bonus, advantage))
      },
      rollDice: record,
      rollNotation: async (label, text) => {
        let dice: Dice
        try {
          dice = parse(text)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Notazione non valida")
          return null
        }
        return record(label, dice)
      },
      logged: !!characterId,
      history,
      clearHistory: () => setHistory([]),
    }),
    [advantage, history, record, characterId]
  )

  return <DiceContext value={value}>{children}</DiceContext>
}

export function useDice() {
  const context = use(DiceContext)
  if (!context) throw new Error("useDice va usato dentro <DiceProvider>")
  return context
}
