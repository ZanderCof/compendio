"use client"

import { useEffect } from "react"

import { heartbeat } from "@/features/presence/actions"

// Ogni quanto dire al server "sono qui" mentre la pagina è visibile
const INTERVAL_MS = 60_000

/** Invisibile: tiene aggiornato lo stato online dell'utente finché il sito è aperto e in primo piano. */
export function PresenceHeartbeat() {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") heartbeat().catch(() => {})
    }
    beat()
    const timer = setInterval(beat, INTERVAL_MS)
    document.addEventListener("visibilitychange", beat)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", beat)
    }
  }, [])

  return null
}
