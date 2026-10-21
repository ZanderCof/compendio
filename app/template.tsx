import { ViewTransition } from "react"

/**
 * Il template si rimonta a ogni navigazione: così la pagina nuova "entra" e la vecchia "esce"
 * con una breve dissolvenza (vedi le classi page-enter / page-exit in globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  )
}
