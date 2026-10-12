import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type SheetTab = {
  value: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

/**
 * Barra di sezioni cliccabili: mostra una sezione alla volta.
 * I contenuti arrivano già renderizzati dal server, qui si sceglie solo quale mostrare.
 */
export function SheetTabs({ tabs }: { tabs: SheetTab[] }) {
  return (
    <Tabs defaultValue={tabs[0].value} className="gap-4">
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
