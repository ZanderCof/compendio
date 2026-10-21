"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  ArrowLeft,
  Dices,
  Grid3x3,
  Map as MapIcon,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  PenTool,
  ScrollText,
} from "lucide-react"
import { toast } from "sonner"

import { SheetSection } from "@/components/characters/sheetSection"
import { CalibrationPanel, type GridDraft } from "@/components/map/calibrationPanel"
import { MapEditorToolbar } from "@/components/map/mapEditorToolbar"
import { MapLibrary } from "@/components/map/mapLibrary"
import { useMapEditor } from "@/components/map/useMapEditor"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { nearestEdge, toggleDoor } from "@/features/maps/editor"
import { calibrateFromRect, fitGrid } from "@/features/maps/grid"
import {
  fetchActiveMap,
  fetchMapVersion,
  setMapOptions,
  toggleMapDoor,
  updateMapGrid,
} from "@/features/maps/actions"
import type { MapView } from "@/features/maps/queries"
import type { UploadMode } from "@/features/maps/upload"
import { EndSessionButton } from "./endSessionButton"

// Konva usa il canvas del browser: niente rendering sul server
const MapStage = dynamic(() => import("@/components/map/mapStage").then((m) => m.MapStage), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted/40" />,
})

// Ogni quanto controllare se la mappa è cambiata (si chiede solo il numero di versione)
const POLL_MS = 1_000

type Panel = "sheet" | "feed" | "chat"
type MobileTab = "map" | Panel

/** Altezza di un pannello in basso: i pulsanti di zoom ci salgono sopra (--controls-bottom). */
function useBottomPanelHeight() {
  const [height, setHeight] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)
  const ref = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect()
    if (!el) {
      setHeight(0)
      return
    }
    observer.current = new ResizeObserver(([entry]) => setHeight(Math.ceil(entry.borderBoxSize[0]?.blockSize ?? 0)))
    observer.current.observe(el)
  }, [])
  return [ref, height] as const
}

export function PlaySession({
  campaignId,
  campaignName,
  startedAtLabel,
  isMaster,
  uploadMode,
  initialMap,
  sheet,
  sheetLabel,
  feed,
  chat,
}: {
  campaignId: string
  campaignName: string
  /** Es. "21:15" */
  startedAtLabel: string
  isMaster: boolean
  uploadMode: UploadMode | null
  initialMap: MapView | null
  /** Personaggio del giocatore oppure dadi del master */
  sheet: React.ReactNode
  sheetLabel: string
  feed: React.ReactNode
  /** La chat in modalità "riempi": qui decide l'altezza il contenitore */
  chat: React.ReactNode
}) {
  const [map, setMap] = useState(initialMap)
  const [mobileTab, setMobileTab] = useState<MobileTab>("map")
  const [sideTab, setSideTab] = useState<Panel>("sheet")
  const [sideOpen, setSideOpen] = useState(true)
  // Il pannello Mappe è aperto/chiuso da qui: non si chiude da solo se la vista cambia sotto
  const [libraryOpen, setLibraryOpen] = useState(false)

  // Editor degli ostacoli (solo master)
  const editor = useMapEditor(map)
  const [panelRef, panelHeight] = useBottomPanelHeight()

  // Calibrazione della griglia (solo master)
  const [draft, setDraft] = useState<GridDraft | null>(null)
  const [calibratingMapId, setCalibratingMapId] = useState<string | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Ultima mappa ricevuta, letta dal controllo periodico senza farlo ripartire a ogni cambio
  const mapRef = useRef(map)
  useEffect(() => {
    mapRef.current = map
  }, [map])

  /** Controlla la versione e ricarica la mappa solo se è cambiata (o se ne è stata scelta un'altra). */
  const sync = useCallback(
    async (force = false) => {
      const latest = await fetchMapVersion(campaignId)
      const current = mapRef.current
      if (!latest) {
        if (current) setMap(null)
        return
      }
      if (force || latest.id !== current?.id || latest.version !== current?.version) {
        setMap(await fetchActiveMap(campaignId))
      }
    },
    [campaignId]
  )

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") sync()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [sync])

  // Se il master attiva un'altra mappa mentre calibra, la calibrazione di quella vecchia si ferma
  const calibrating = draft !== null && map !== null && calibratingMapId === map.id

  function startCalibration() {
    if (!map) return
    if (editor.editing) editor.stop()
    setCalibratingMapId(map.id)
    setDraft({ cellSize: map.grid.cellSize, offsetX: map.grid.offsetX, offsetY: map.grid.offsetY, showGrid: map.showGrid })
    setDrawing(true)
    setMobileTab("map")
  }

  function stopCalibration() {
    setDraft(null)
    setDrawing(false)
  }

  async function saveCalibration() {
    if (!map || !draft) return
    setSaving(true)
    const result = await updateMapGrid(map.id, draft)
    setSaving(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success("Griglia salvata")
    stopCalibration()
    sync(true)
  }

  function startEditing() {
    if (!map) return
    stopCalibration()
    editor.start()
    setMobileTab("map")
  }

  async function stopEditing() {
    await editor.stop()
    sync(true)
  }

  /** Opzioni della mappa: si vedono cambiare subito, poi il server conferma. */
  async function changeOption(option: "showObstacles" | "playersOpenDoors", value: boolean) {
    if (!map) return
    setMap({ ...map, [option]: value })
    const result = await setMapOptions(map.id, { [option]: value })
    if (result?.error) toast.error(result.error)
    sync(true)
  }

  const canOpenDoors = !!map && (isMaster || (map.playersOpenDoors && map.showObstacles))

  /** Tocco su una porta (fuori dall'editor): si apre o si chiude subito, poi il server conferma. */
  async function handleTap(point: { x: number; y: number }) {
    if (!map || !canOpenDoors) return
    const edge = nearestEdge(point, map.grid)
    if (!edge || !(edge in map.layout.doors)) return
    setMap({ ...map, layout: toggleDoor(map.layout, edge) })
    const result = await toggleMapDoor(map.id, edge)
    if (result?.error) toast.error(result.error)
    sync(true)
  }

  // Durante la calibrazione si vede l'anteprima della griglia, non quella salvata
  const shownGrid =
    map && calibrating && draft
      ? fitGrid(draft.cellSize, draft.offsetX, draft.offsetY, map.imageWidth, map.imageHeight)
      : map?.grid

  const backHref = `/campaigns/${campaignId}`

  const library = isMaster && (
    <MapLibrary
      campaignId={campaignId}
      uploadMode={uploadMode}
      open={libraryOpen}
      onOpenChange={setLibraryOpen}
      onChanged={() => sync(true)}
      onActiveMap={(next) => {
        // La vista cambia subito; il controllo periodico poi conferma
        mapRef.current = next
        setMap(next)
        if (!next) {
          stopCalibration()
          editor.stop()
        }
      }}
    />
  )

  // Intestazione: una riga compatta su telefono (titolo e icone), completa su desktop
  const header = (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="Torna al riepilogo">
        <Link href={backHref}>
          <ArrowLeft />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="shrink-0 max-lg:hidden">
        <Link href={backHref}>
          <ArrowLeft />
          Riepilogo
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl leading-tight tracking-wide lg:text-2xl">{campaignName}</h1>
        <p className="truncate text-xs text-muted-foreground">Sessione in corso dalle {startedAtLabel}</p>
      </div>
      {isMaster && (
        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          <Button variant="ghost" size="icon" aria-label="Mappe" onClick={() => setLibraryOpen(true)}>
            <MapIcon />
          </Button>
          {map && (
            <>
              <Button variant="ghost" size="icon" aria-label="Calibra la griglia" onClick={startCalibration}>
                <Grid3x3 />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Modifica mappa" onClick={startEditing}>
                <PenTool />
              </Button>
            </>
          )}
          <EndSessionButton campaignId={campaignId} compact />
        </div>
      )}
      {isMaster && (
        <div className="shrink-0 max-lg:hidden">
          <EndSessionButton campaignId={campaignId} />
        </div>
      )}
    </div>
  )

  // Senza mappa attiva la sessione resta com'era: scheda (o dadi) e tiri affiancati
  if (!map) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        {isMaster && (
          <Button variant="secondary" className="self-start max-lg:hidden" onClick={() => setLibraryOpen(true)}>
            <MapIcon />
            Mappe
          </Button>
        )}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_2fr]">
          {sheet}
          <div className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--nav-h)+1rem)]">
            {feed}
            <SheetSection title="Chat">
              <div className="h-112">{chat}</div>
            </SheetSection>
          </div>
        </div>
        {library}
      </div>
    )
  }

  const tabs: { value: Panel; label: string; icon: typeof ScrollText }[] = [
    { value: "sheet", label: sheetLabel, icon: isMaster ? Dices : ScrollText },
    { value: "feed", label: "Tiri", icon: Dices },
    { value: "chat", label: "Chat", icon: MessageCircle },
  ]

  /** Un pannello: su telefono decide la barra in basso, su desktop la colonna laterale. */
  const panelClass = (panel: Panel) =>
    cn(
      "h-full min-h-0",
      mobileTab === panel ? "block" : "hidden",
      sideOpen && sideTab === panel ? "lg:block" : "lg:hidden",
      // La chat ha il suo scorrimento interno; gli altri pannelli scorrono interi
      panel === "chat" ? "" : "overflow-y-auto pr-1"
    )

  return (
    <div
      // Su telefono: esattamente lo schermo sotto la navbar, senza scroll né footer (vedi globals.css)
      data-session-fullscreen
      className={cn(
        "fixed inset-x-0 top-(--nav-h) bottom-0 z-20 flex flex-col bg-background px-3 pt-2",
        "lg:static lg:z-auto lg:gap-3 lg:bg-transparent lg:p-0",
        // Il pulsante dei dadi sta sopra la barra in basso (variabile letta da DiceTray)
        "[--bottom-bar:4.5rem] lg:[--bottom-bar:0px]"
      )}
    >
      {header}

      <div className="mt-2 flex min-h-0 flex-1 gap-4 lg:mt-0 lg:h-[calc(100dvh-10rem)] lg:min-h-112 lg:flex-none">
        {/* Mappa */}
        <div
          className={cn(
            "relative min-w-0 flex-1 overflow-hidden rounded-xl border",
            mobileTab === "map" ? "block" : "hidden",
            "lg:block"
          )}
          // I pulsanti di zoom salgono sopra il pannello in basso (calibrazione o editor)
          style={{ "--controls-bottom": `${calibrating || editor.editing ? panelHeight : 0}px` } as React.CSSProperties}
        >
          <MapStage
            imageUrl={map.imageUrl}
            imageWidth={map.imageWidth}
            imageHeight={map.imageHeight}
            grid={shownGrid ?? map.grid}
            showGrid={calibrating || editor.editing ? true : map.showGrid}
            // In modifica si vede lo stato dell'editor; altrimenti gli ostacoli (per i giocatori solo se mostrati)
            layout={editor.editing ? (editor.layout ?? map.layout) : map.layout}
            edit={editor.handlers}
            highlightEdge={editor.hoverEdge}
            onTap={editor.editing || calibrating ? undefined : handleTap}
            calibrating={calibrating && drawing}
            onCalibrateRect={(rect) => {
              const g = calibrateFromRect(rect, map.imageWidth, map.imageHeight)
              setDraft((d) => d && { ...d, cellSize: g.cellSize, offsetX: g.offsetX, offsetY: g.offsetY })
              setDrawing(false)
            }}
          />

          {/* Strumenti del master su desktop (su telefono stanno nell'intestazione) */}
          {isMaster && !calibrating && !editor.editing && (
            <div className="absolute top-3 left-3 flex gap-2 max-lg:hidden">
              <Button variant="secondary" className="shadow" onClick={() => setLibraryOpen(true)}>
                <MapIcon />
                Mappe
              </Button>
              <Button variant="secondary" className="shadow" onClick={startCalibration}>
                <Grid3x3 />
                Griglia
              </Button>
              <Button variant="secondary" className="shadow" onClick={startEditing}>
                <PenTool />
                Modifica mappa
              </Button>
            </div>
          )}

          {/* Calibrazione: in alto a sinistra su desktop, pannello in basso su telefono e tablet */}
          {calibrating && draft && (
            <div
              ref={panelRef}
              className="absolute inset-x-0 bottom-0 z-10 lg:inset-x-auto lg:bottom-auto lg:top-3 lg:left-3 lg:w-96"
            >
              <CalibrationPanel
                draft={draft}
                onChange={setDraft}
                drawing={drawing}
                onToggleDrawing={() => setDrawing((d) => !d)}
                onSave={saveCalibration}
                onCancel={stopCalibration}
                saving={saving}
              />
            </div>
          )}

          {/* Editor degli ostacoli: in alto a sinistra su desktop, pannello in basso su telefono e tablet */}
          {editor.editing && (
            <div
              ref={panelRef}
              className="absolute inset-x-0 bottom-0 z-10 lg:inset-x-auto lg:bottom-auto lg:top-3 lg:left-3 lg:w-96"
            >
              <MapEditorToolbar
                tool={editor.tool}
                onTool={editor.setTool}
                onUndo={editor.undo}
                onRedo={editor.redo}
                canUndo={editor.canUndo}
                canRedo={editor.canRedo}
                saveStatus={editor.saveStatus}
                showObstacles={map.showObstacles}
                onShowObstacles={(value) => changeOption("showObstacles", value)}
                playersOpenDoors={map.playersOpenDoors}
                onPlayersOpenDoors={(value) => changeOption("playersOpenDoors", value)}
                onDone={stopEditing}
              />
            </div>
          )}
        </div>

        {/* Colonna laterale su desktop / pannello a tutto schermo su telefono */}
        <aside
          className={cn(
            "min-h-0 min-w-0 flex-col gap-3",
            mobileTab === "map" ? "hidden" : "flex flex-1",
            sideOpen ? "lg:flex lg:w-104 lg:flex-none" : "lg:flex lg:w-auto lg:flex-none"
          )}
        >
          <div className="hidden items-center gap-1 lg:flex">
            {sideOpen &&
              tabs.map((tab) => (
                <Button
                  key={tab.value}
                  size="sm"
                  variant={sideTab === tab.value ? "default" : "ghost"}
                  onClick={() => setSideTab(tab.value)}
                >
                  <tab.icon />
                  {tab.label}
                </Button>
              ))}
            <Button
              size="icon"
              variant="ghost"
              className="ml-auto"
              aria-label={sideOpen ? "Chiudi il pannello" : "Apri il pannello"}
              onClick={() => setSideOpen((o) => !o)}
            >
              {sideOpen ? <PanelRightClose /> : <PanelRightOpen />}
            </Button>
          </div>

          {/* I pannelli restano montati anche quando sono nascosti: non si perde lo stato (scheda, chat) */}
          <div className="min-h-0 flex-1">
            <div className={panelClass("sheet")}>{sheet}</div>
            <div className={panelClass("feed")}>{feed}</div>
            <div className={panelClass("chat")}>
              <div className="flex h-full min-h-0 flex-col rounded-xl border bg-card p-3">
                <h2 className="mb-2 text-lg tracking-wide text-primary">Chat</h2>
                <div className="min-h-0 flex-1">{chat}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Barra in basso su telefono: dentro lo schermo, non sovrapposta ai contenuti */}
      <nav
        className="-mx-3 mt-2 grid shrink-0 grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Sezioni della sessione"
      >
        {[{ value: "map" as const, label: "Mappa", icon: MapIcon }, ...tabs].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setMobileTab(tab.value)}
            aria-current={mobileTab === tab.value ? "page" : undefined}
            className={cn(
              "font-display flex h-16 flex-col items-center justify-center gap-0.5 text-xs tracking-wide transition-colors",
              mobileTab === tab.value ? "text-primary" : "text-muted-foreground"
            )}
          >
            <tab.icon className="size-5" />
            {tab.label}
          </button>
        ))}
      </nav>

      {library}
    </div>
  )
}
