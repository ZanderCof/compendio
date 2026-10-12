export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/characters", label: "Personaggi" },
  { href: "/campaigns", label: "Campagne" },
] as const

/** "/" è attivo solo sulla home, gli altri link anche sulle sottopagine. */
export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
