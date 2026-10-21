import Link from "next/link"
import { Dices } from "lucide-react"

import { NAV_LINKS } from "./navLinks"

const externalLink = "link-underline text-foreground/80 hover:text-primary"

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/40">
      <div className="mx-auto grid grid-cols-1 w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[2fr_1fr] lg:grid-cols-[2fr_1fr_2fr]">
        <div className="flex flex-col gap-3">
          <p className="font-display flex items-center gap-2 text-xl tracking-wide">
            <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-plum to-violet text-primary-foreground">
              <Dices className="size-5" />
            </span>
            Compendio
          </p>
          <p className="text-muted-foreground">Schede, dadi, mappa e campagne per il tuo gruppo di gioco.</p>
        </div>

        <nav aria-label="Footer">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Naviga</p>
          <ul className="mt-3 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="link-underline hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Crediti: il font Nodesto è CC BY-SA 4.0 e richiede l'attribuzione */}
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground sm:col-span-2 lg:col-span-1">
          <p className="text-xs tracking-widest uppercase">Crediti</p>
          <p>
            Font Nodesto Caps Condensed di{" "}
            <a href="https://github.com/jonathonf/solbera-dnd-fonts" className={externalLink} target="_blank" rel="noopener noreferrer">
              Solbera
            </a>
            , licenza{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" className={externalLink} target="_blank" rel="noopener noreferrer">
              CC BY-SA 4.0
            </a>
            , modificato per aggiungere le vocali accentate.
          </p>
          <p>
            Progetto amatoriale non ufficiale, non affiliato a Wizards of the Coast. Dungeons &amp; Dragons è un marchio
            di Wizards of the Coast LLC.
          </p>
        </div>
      </div>
    </footer>
  )
}
