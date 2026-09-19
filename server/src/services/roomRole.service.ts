import { RoomRole, type RoomMember } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { roomMemberService, type RoomMemberSummary } from './roomMember.service'

export interface RemovedMember {
  member: RoomMember
  members: RoomMemberSummary[]
}

export class RoomRoleService {
  async assignRole(
    roomId: string,
    targetUserId: string,
    role: RoomRole
  ): Promise<RoomMemberSummary[]> {
    if (role === RoomRole.HOST) {
      throw new AppError(400, 'Use transfer_host to assign the HOST role')
    }
    if (role !== RoomRole.MODERATOR && role !== RoomRole.PARTICIPANT && role !== RoomRole.VIEWER) {
      throw new AppError(400, 'Only MODERATOR, PARTICIPANT, or VIEWER can be assigned')
    }

    const target = await roomMemberService.getActiveMember(roomId, targetUserId)
    if (!target) {
      throw new AppError(404, 'Target participant is not an active member of this room')
    }
    if (target.role === RoomRole.HOST) {
      throw new AppError(400, 'The current host must use transfer_host')
    }

    await prisma.roomMember.update({
      where: { id: target.id },
      data: { role },
    })

    return roomMemberService.getActiveMembers(roomId)
  }

  async removeParticipant(
    roomId: string,
    targetUserId: string
  ): Promise<RemovedMember> {
    const target = await roomMemberService.getActiveMember(roomId, targetUserId)
    if (!target) {
      throw new AppError(404, 'Target participant is not an active member of this room')
    }
    if (target.role === RoomRole.HOST) {
      throw new AppError(400, 'The host cannot be removed')
    }

    // Deactivate the membership so the removed user cannot rejoin or operate.
    const member = await prisma.roomMember.update({
      where: { id: target.id },
      data: { isBanned: true, role: RoomRole.PARTICIPANT },
    })

    return {
      member,
      members: await roomMemberService.getActiveMembers(roomId),
    }
  }

  async transferHost(
    roomId: string,
    currentHostUserId: string,
    targetUserId: string,
    previousHostRole: RoomRole = RoomRole.PARTICIPANT
  ): Promise<RoomMemberSummary[]> {
    if (
      previousHostRole !== RoomRole.PARTICIPANT &&
      previousHostRole !== RoomRole.MODERATOR
    ) {
      throw new AppError(400, 'The previous host role must be PARTICIPANT or MODERATOR')
    }
    if (currentHostUserId === targetUserId) {
      throw new AppError(400, 'The host must transfer ownership to another member')
    }

    await prisma.$transaction(async (tx) => {
      const [currentHost, target] = await Promise.all([
        tx.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: currentHostUserId } },
        }),
        tx.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: targetUserId } },
        }),
      ])

      if (!currentHost || currentHost.isBanned || currentHost.role !== RoomRole.HOST) {
        throw new AppError(403, 'Only the current host can transfer host ownership')
      }
      if (!target || target.isBanned) {
        throw new AppError(404, 'Target participant is not an active member of this room')
      }

      await tx.roomMember.update({
        where: { id: currentHost.id },
        data: { role: previousHostRole },
      })
      await tx.roomMember.update({
        where: { id: target.id },
        data: { role: RoomRole.HOST },
      })
    })

    return roomMemberService.getActiveMembers(roomId)
  }
}

export const roomRoleService = new RoomRoleService()
