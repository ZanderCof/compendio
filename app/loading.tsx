/** Caricamento di una pagina: titolo, una riga di riquadri e due card, come le pagine vere. */
export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:py-8"
      aria-busy="true"
      aria-label="Caricamento"
    >
      <div className="flex flex-col gap-2">
        <div className="h-10 w-64 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted/70" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" style={{ animationDelay: "200ms" }} />
      </div>
    </main>
  )
}
