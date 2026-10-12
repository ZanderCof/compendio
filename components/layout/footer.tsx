import Link from "next/link"

import { NAV_LINKS } from "./navLinks"

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:grid-cols-[2fr_1fr_2fr]">
        <div>
          <p className="text-lg tracking-wide">Compendio</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Schede, dadi e campagne per il tuo gruppo di gioco.
          </p>
        </div>

        <nav aria-label="Footer">
          <p className="text-xs tracking-widest text-muted-foreground">Naviga</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Crediti: il font Nodesto è CC BY-SA 4.0 e richiede l'attribuzione */}
        <div className="text-xs text-muted-foreground">
          <p className="tracking-widest">Crediti</p>
          <p className="mt-2">
            Font Nodesto Caps Condensed di{" "}
            <a
              href="https://github.com/jonathonf/solbera-dnd-fonts"
              className="underline underline-offset-2 hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Solbera
            </a>
            , licenza{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              className="underline underline-offset-2 hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY-SA 4.0
            </a>
            , modificato per aggiungere le vocali accentate.
          </p>
          <p className="mt-2">
            Progetto amatoriale non ufficiale, non affiliato a Wizards of the Coast. Dungeons &amp;
            Dragons è un marchio di Wizards of the Coast LLC.
          </p>
        </div>
      </div>
    </footer>
  )
}
