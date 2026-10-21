"use client"

import { useEffect, useRef, useState } from "react"
import { Check, EyeOff, ImagePlus, LoaderCircle, Map as MapIcon, Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { ConfirmButton } from "@/components/shared/confirmButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { createMap, deleteMap, fetchMaps, renameMap, setActiveMap } from "@/features/maps/actions"
import type { MapSummary, MapView } from "@/features/maps/queries"
import type { UploadMode } from "@/features/maps/upload"
import { checkImageFile, readImageSize, uploadErrorMessage, uploadMapImage } from "./uploadImage"

function UploadForm({
  campaignId,
  uploadMode,
  onCreated,
}: {
  campaignId: string
  uploadMode: UploadMode | null
  onCreated: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!uploadMode) {
    return (
      <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        Il caricamento delle immagini non è configurato: serve BLOB_READ_WRITE_TOKEN.
      </p>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !uploadMode) return
    const problem = checkImageFile(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setBusy(true)
    try {
      // Prima si legge l'immagine: un file rovinato si ferma qui, senza caricarlo
      const { width, height } = await readImageSize(file)
      const imageUrl = await uploadMapImage(file, campaignId, uploadMode)
      const result = await createMap(campaignId, {
        name: name.trim() || file.name.replace(/\.[^.]+$/, ""),
        imageUrl,
        imageWidth: width,
        imageHeight: height,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Mappa caricata: ora calibra la griglia")
      setFile(null)
      setName("")
      if (inputRef.current) inputRef.current.value = ""
      onCreated()
    } catch (error) {
      toast.error(uploadErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-dashed p-3">
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg bg-secondary/40 p-4 text-center text-sm hover:bg-secondary/60">
        <ImagePlus className="size-6 text-violet" />
        {file ? <span className="max-w-full truncate">{file.name}</span> : <span>Scegli un&apos;immagine (jpg, png, webp, max 10 MB)</span>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome della mappa" maxLength={80} />
      <Button type="submit" size="lg" disabled={!file || busy}>
        {busy ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
        {busy ? "Carico…" : "Carica mappa"}
      </Button>
    </form>
  )
}

type RowAction = "activate" | "deactivate" | "rename"

function MapRow({
  map,
  onActivate,
  onRename,
  onDelete,
}: {
  map: MapSummary
  onActivate: (active: boolean) => Promise<boolean>
  onRename: (name: string) => Promise<boolean>
  onDelete: () => Promise<{ error?: string } | undefined>
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(map.name)
  // Solo il pulsante premuto mostra l'attesa: gli altri restano usabili
  const [pending, setPending] = useState<RowAction | null>(null)

  async function act(action: RowAction, run: () => Promise<boolean>) {
    setPending(action)
    await run()
    setPending(null)
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- anteprima di un'immagine caricata dall'utente */}
        <img src={map.imageUrl} alt="" className="size-14 shrink-0 rounded-md object-cover" />
        <div className="min-w-0 flex-1">
          {renaming ? (
            <form
              className="flex gap-1"
              onSubmit={(e) => {
                e.preventDefault()
                setRenaming(false)
                act("rename", () => onRename(name))
              }}
            >
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus className="h-9" />
              <Button type="submit" size="icon" variant="ghost" aria-label="Salva nome">
                <Check />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Annulla"
                onClick={() => {
                  setName(map.name)
                  setRenaming(false)
                }}
              >
                <X />
              </Button>
            </form>
          ) : (
            <p className="flex items-center gap-1.5 truncate tracking-wide">
              {map.name}
              {pending === "rename" && <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {map.cols} × {map.rows} celle
          </p>
        </div>
        {map.active && <Badge className="shrink-0 bg-aqua text-foreground">In uso</Badge>}
      </div>
      <div className="flex flex-wrap gap-2">
        {map.active ? (
          <Button variant="outline" disabled={pending === "deactivate"} onClick={() => act("deactivate", () => onActivate(false))}>
            {pending === "deactivate" ? <LoaderCircle className="animate-spin" /> : <EyeOff />}
            Togli dalla sessione
          </Button>
        ) : (
          <Button disabled={pending === "activate"} onClick={() => act("activate", () => onActivate(true))}>
            {pending === "activate" ? <LoaderCircle className="animate-spin" /> : <MapIcon />}
            Usa in sessione
          </Button>
        )}
        <Button variant="ghost" onClick={() => setRenaming(true)} disabled={renaming}>
          <Pencil />
          Rinomina
        </Button>
        <ConfirmButton
          variant="ghost"
          className="text-destructive"
          icon={<Trash2 />}
          label="Elimina"
          confirmLabel="Tocca di nuovo"
          action={onDelete}
        />
      </div>
    </li>
  )
}

/** Pannello del master: carica le mappe, scegli quella in uso, rinomina ed elimina. */
export function MapLibrary({
  campaignId,
  uploadMode,
  open,
  onOpenChange,
  onChanged,
  onActiveMap,
}: {
  campaignId: string
  uploadMode: UploadMode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dopo una modifica che può cambiare la mappa in uso: la sessione si riallinea col server */
  onChanged: () => void
  /** La mappa in uso è cambiata: la sessione la mostra subito, senza aspettare il polling */
  onActiveMap: (map: MapView | null) => void
}) {
  const [maps, setMaps] = useState<MapSummary[] | null>(null)

  const reload = async () => setMaps(await fetchMaps(campaignId))

  // L'elenco si carica ogni volta che si apre il pannello
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchMaps(campaignId).then((list) => {
      if (!cancelled) setMaps(list)
    })
    return () => {
      cancelled = true
    }
  }, [open, campaignId])

  /** Aggiorna l'elenco subito; se il server rifiuta, torna com'era. */
  async function optimistic(update: (list: MapSummary[]) => MapSummary[], run: () => Promise<{ error?: string } | undefined>) {
    const before = maps
    setMaps((list) => (list ? update(list) : list))
    const result = await run()
    if (result?.error) {
      toast.error(result.error)
      setMaps(before)
      return false
    }
    return true
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl tracking-wide">Mappe della campagna</SheetTitle>
          <SheetDescription>Caricane una e scegli quale usare in sessione.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <UploadForm
            campaignId={campaignId}
            uploadMode={uploadMode}
            onCreated={() => {
              reload()
              onChanged()
            }}
          />
          {maps === null ? (
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
          ) : maps.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Nessuna mappa salvata.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {maps.map((map) => (
                <MapRow
                  key={map.id}
                  map={map}
                  onRename={(name) =>
                    optimistic(
                      (list) => list.map((m) => (m.id === map.id ? { ...m, name: name.trim() || m.name } : m)),
                      () => renameMap(map.id, name)
                    )
                  }
                  onActivate={async (active) => {
                    // "Togli": la vista cambia subito, prima della risposta del server
                    if (!active) onActiveMap(null)
                    let activated: MapView | null | undefined
                    const ok = await optimistic(
                      (list) => list.map((m) => ({ ...m, active: active ? m.id === map.id : false })),
                      async () => {
                        const result = await setActiveMap(campaignId, active ? map.id : null)
                        activated = result.map
                        return result
                      }
                    )
                    if (ok) {
                      // "Usa": la mappa arriva con la risposta, niente attesa del polling
                      if (active) onActiveMap(activated ?? null)
                      onOpenChange(false)
                    } else {
                      onChanged()
                    }
                    return ok
                  }}
                  onDelete={async () => {
                    const ok = await optimistic((list) => list.filter((m) => m.id !== map.id), () => deleteMap(map.id))
                    if (ok && map.active) onChanged()
                    return undefined
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
