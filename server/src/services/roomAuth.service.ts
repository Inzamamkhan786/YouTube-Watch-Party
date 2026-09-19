import { RoomRole, type RoomMember } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

/**
 * Reusable room authorization service.
 * NEVER trusts role claims from the client.
 * Always resolves authenticated user membership and role directly from PostgreSQL.
 */
export class RoomAuthorizationService {
  /**
   * Retrieves user membership in a room from PostgreSQL.
   */
  async getMember(roomId: string, userId: string): Promise<RoomMember | null> {
    return prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })
  }

  /**
   * Verifies that the user is an active member of the room.
   * Throws 403 Forbidden if not a member or banned.
   */
  async requireMembership(roomId: string, userId: string): Promise<RoomMember> {
    const member = await this.getMember(roomId, userId)

    if (!member) {
      throw new AppError(403, 'You are not a member of this room')
    }

    if (member.isBanned) {
      throw new AppError(403, 'You have been removed and banned from this room')
    }

    return member
  }

  /**
   * Verifies that the user holds one of the required roles in the room.
   * Throws 403 Forbidden if the user's database role is insufficient.
   */
  async requireRole(
    roomId: string,
    userId: string,
    allowedRoles: RoomRole[]
  ): Promise<RoomMember> {
    const member = await this.requireMembership(roomId, userId)

    if (!allowedRoles.includes(member.role)) {
      throw new AppError(
        403,
        `Forbidden: This action requires one of the following roles: [${allowedRoles.join(', ')}]`
      )
    }

    return member
  }

  /**
   * Checks if the user is the room host according to the database.
   */
  async isHost(roomId: string, userId: string): Promise<boolean> {
    const member = await this.getMember(roomId, userId)
    return member?.role === RoomRole.HOST && !member.isBanned
  }

  /**
   * Checks if the user has moderator or host privileges in the room.
   */
  async canModerate(roomId: string, userId: string): Promise<boolean> {
    const member = await this.getMember(roomId, userId)
    return (
      (member?.role === RoomRole.HOST || member?.role === RoomRole.MODERATOR) &&
      !member.isBanned
    )
  }
}

export const roomAuthorizationService = new RoomAuthorizationService()
