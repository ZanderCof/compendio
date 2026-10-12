import Link from "next/link"
import { Hourglass } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Segnaposto per le pagine della prossima fase, così i link della navbar non portano a un 404. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-violet">
        <Hourglass className="size-6" />
      </span>
      <h1 className="text-4xl tracking-wide">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      <Button variant="outline" asChild>
        <Link href="/">Torna alla home</Link>
      </Button>
    </main>
  )
}
