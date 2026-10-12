"use client"

import { useSearchParams } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type SheetTab = {
  value: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

// Nome del parametro nell'URL: /characters/abc?sezione=incantesimi
const PARAM = "sezione"

/**
 * Barra di sezioni cliccabili: mostra una sezione alla volta.
 * La sezione aperta sta nell'URL, così sopravvive al ricaricamento e si può condividere.
 */
export function SheetTabs({ tabs }: { tabs: SheetTab[] }) {
  const searchParams = useSearchParams()
  const requested = searchParams.get(PARAM)
  // Una sezione che non esiste (es. "incantesimi" per un guerriero) apre la prima
  const current = tabs.some((tab) => tab.value === requested) ? requested! : tabs[0].value

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === tabs[0].value) params.delete(PARAM)
    else params.set(PARAM, value)
    const query = params.toString()
    // replace e non push: il tasto "indietro" esce dalla scheda invece di scorrere le sezioni
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname)
  }

  return (
    <Tabs value={current} onValueChange={select} className="gap-4">
      <TabsList className="sticky top-16 z-10 h-auto! w-full justify-start gap-1 overflow-x-auto rounded-xl border bg-card/95 p-1.5 backdrop-blur [scrollbar-width:none]">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-9 flex-none gap-1.5 rounded-lg px-3 tracking-wide data-active:bg-primary! data-active:text-primary-foreground! data-active:shadow-none"
          >
            {tab.icon}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="flex flex-col gap-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
