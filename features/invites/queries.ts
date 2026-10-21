import "server-only"

import { prisma } from "@/lib/prisma"

/** Tutti i codici con chi si è registrato. Solo per la pagina admin (che chiama requireAdmin). */
export async function listInviteCodes() {
  return prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      label: true,
      maxUses: true,
      uses: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      createdBy: { select: { name: true } },
      redeemedBy: { select: { id: true, name: true, email: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  })
}
