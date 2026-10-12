"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCharacter } from "./characterProvider"
import { SheetSection } from "./sheetSection"

const RECHARGE_LABEL = { short: "riposo breve", long: "riposo lungo" } as const

function AddResourceForm() {
  const { dispatch } = useCharacter()
  const [name, setName] = useState("")
  const [max, setMax] = useState(1)
  const [recharge, setRecharge] = useState<"short" | "long">("long")

  return (
    <form
      className="mt-3 flex flex-wrap gap-2 rounded-lg border border-dashed p-3"
      onSubmit={(e) => {
        e.preventDefault()
        dispatch({ type: "addResource", resource: { name, max, used: 0, recharge } })
        setName("")
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="es. Ira, Incanalare Divinità"
        aria-label="Nome della capacità"
        className="min-w-40 flex-1"
        maxLength={60}
      />
      <Input
        type="number"
        min={1}
        max={99}
        value={max}
        onChange={(e) => setMax(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
        aria-label="Usi"
        className="w-16"
      />
      <select
        value={recharge}
        onChange={(e) => setRecharge(e.target.value as "short" | "long")}
        aria-label="Si ricarica con"
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="short">Riposo breve</option>
        <option value="long">Riposo lungo</option>
      </select>
      <Button type="submit" disabled={!name.trim()}>
        <Plus />
        Aggiungi
      </Button>
    </form>
  )
}

/** Capacità a usi limitati: pallini pieni = usi disponibili. Tocchi un pieno per spenderlo, un vuoto per recuperarlo. */
export function ResourcesSection() {
  const { character, dispatch, editing, readOnly } = useCharacter()
  const { resources } = character

  if (resources.length === 0 && !editing) {
    return (
      <SheetSection title="Capacità">
        <p className="text-sm text-muted-foreground">
          Nessuna capacità a usi limitati.{" "}
          {!readOnly && "Con “Modifica” puoi aggiungere Ira, Incanalare Divinità, Seconda Ispirazione…"}
        </p>
      </SheetSection>
    )
  }

  return (
    <SheetSection title="Capacità">
      <ul className="flex flex-col gap-2">
        {resources.map((resource, index) => {
          const available = resource.max - resource.used
          return (
            <li key={`${resource.name}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="min-w-0 flex-1">
                <p className="truncate">{resource.name}</p>
                <p className="text-xs text-muted-foreground">
                  {available}/{resource.max} · si ricarica con il {RECHARGE_LABEL[resource.recharge]}
                </p>
              </div>
              <span className="flex flex-wrap gap-1.5">
                {Array.from({ length: resource.max }, (_, i) => {
                  const isAvailable = i < available
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        dispatch({
                          type: "setResourceUsed",
                          index,
                          used: isAvailable ? resource.used + 1 : resource.used - 1,
                        })
                      }
                      aria-label={isAvailable ? `Usa ${resource.name}` : `Recupera ${resource.name}`}
                      className={cn(
                        "size-4 rounded-full border-2 border-plum transition-colors",
                        isAvailable ? "bg-plum hover:bg-plum/70" : "hover:bg-plum/30",
                        readOnly && "pointer-events-none"
                      )}
                    />
                  )
                })}
              </span>
              {editing && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive"
                  aria-label={`Elimina ${resource.name}`}
                  onClick={() => dispatch({ type: "removeResource", index })}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {editing && <AddResourceForm />}
    </SheetSection>
  )
}
