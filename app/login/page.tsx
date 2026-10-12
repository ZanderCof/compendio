import type { Metadata } from "next"

import { GoogleSignInButton } from "@/components/auth/googleSignInButton"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Accedi · Compendio",
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="relative w-full max-w-sm overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-plum via-periwinkle to-aqua" />
        <CardContent className="flex flex-col items-center gap-6 py-6 text-center">
          <div>
            <h1 className="text-4xl tracking-wide">Compendio</h1>
            <p className="mt-1 text-muted-foreground">Le schede del tuo gruppo, sempre sottomano</p>
          </div>
          <GoogleSignInButton />
        </CardContent>
      </Card>
    </main>
  )
}
