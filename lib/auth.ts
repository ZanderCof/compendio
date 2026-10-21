import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"

import { beforeUserCreate } from "@/features/invites/signupHook"
import { prisma } from "@/lib/prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Unico metodo di accesso: Google. Credenziali da Google Cloud Console → .env
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
    },
  },
  user: {
    // Lo imposta solo l'hook degli inviti, mai il client
    additionalFields: {
      inviteCodeId: { type: "string", required: false, input: false },
      joinedVia: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      // Beta su invito (INVITE_ONLY): blocca i nuovi utenti senza un invito valido
      create: { before: (user, ctx) => beforeUserCreate(user, ctx ?? null) },
    },
  },
  // Permette alle Server Actions di impostare i cookie di sessione
  plugins: [nextCookies()],
})
