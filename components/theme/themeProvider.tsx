"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/** Tema chiaro/scuro: aggiunge la classe "dark" a <html>, i colori sono in globals.css. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
