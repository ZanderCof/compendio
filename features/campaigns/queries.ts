import "server-only"

import { prisma } from "@/lib/prisma"

export async function listMyCampaigns(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: {
      role: true,
      campaign: {
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: { members: true, characters: true, sessions: { where: { status: "ACTIVE" } } },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  })
  return memberships.map(({ role, campaign }) => ({ role, ...campaign }))
}

/** Campagna con membri, solo se l'utente ne fa parte. Altrimenti null. */
export async function getCampaignForMember(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, members: { some: { userId } } },
    select: {
      id: true,
      name: true,
      description: true,
      inviteCode: true,
      members: {
        select: { role: true, user: { select: { id: true, name: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  })
  if (!campaign) return null

  const role = campaign.members.find((m) => m.user.id === userId)!.role
  return {
    ...campaign,
    role,
    // Il codice invito lo vede solo il master
    inviteCode: role === "MASTER" ? campaign.inviteCode : null,
  }
}

export async function getCampaignByInviteCode(code: string) {
  return prisma.campaign.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { members: true } },
      members: { where: { role: "MASTER" }, select: { user: { select: { name: true } } } },
    },
  })
}

/** Inviti in attesa per l'email dell'utente, con chi l'ha invitato. */
export async function listMyInvitations(email: string) {
  return prisma.invitation.findMany({
    where: { email: email.toLowerCase(), status: "PENDING" },
    select: {
      id: true,
      createdAt: true,
      campaign: { select: { name: true, description: true } },
      invitedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}
