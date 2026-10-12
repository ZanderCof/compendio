/** Iniziali per gli avatar: prima lettera delle prime due parole, ignorando simboli e numeri. */
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((word) => word.match(/\p{L}/u)?.[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  )
}
