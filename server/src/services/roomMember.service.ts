import bcrypt from 'bcryptjs'
import { RoomRole, type RoomMember } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { roomService, type RoomDetails } from './room.service'
import { roomAuthorizationService } from './roomAuth.service'
import { AppError } from '../middleware/errorHandler'
import { env } from '../config/env'

export interface RoomMemberSummary {
  id: string
  role: RoomRole
  joinedAt: Date
  user: {
    id: string
    username: string
    displayName?: string | null
    avatarUrl?: string | null
  }
}

export class RoomMemberService {
  async getActiveMember(roomId: string, userId: string): Promise<RoomMember | null> {
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    })
    return member && !member.isBanned ? member : null
  }

  async getActiveMembers(roomId: string): Promise<RoomMemberSummary[]> {
    return prisma.roomMember.findMany({
      where: { roomId, isBanned: false },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })
  }

  /**
   * Joins a room using the room code.
   * If already a member, returns existing membership idempotently.
   * New members receive the default PARTICIPANT role.
   */
  async joinRoom(
    userId: string,
    roomCode: string,
    passcode?: string
  ): Promise<{ room: RoomDetails; member: RoomMember }> {
    const normalizedCode = roomCode.trim().toUpperCase()

    // Find room
    const room = await prisma.room.findUnique({
      where: { roomCode: normalizedCode },
      include: {
        _count: {
          select: { members: true },
        },
      },
    })

    if (!room) {
      throw new AppError(404, `Room with code '${normalizedCode}' was not found`)
    }

    // Check if existing member
    const existing = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId,
        },
      },
    })

    if (existing) {
      if (existing.isBanned) {
        throw new AppError(403, 'You have been banned from this room')
      }
      // Update last seen
      const updated = await prisma.roomMember.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      })
      const details = await roomService.getRoomByCode(normalizedCode, userId)
      return { room: details, member: updated }
    }

    // Capacity check
    if (room._count.members >= room.maxMembers) {
      throw new AppError(400, 'This room has reached its maximum capacity of members')
    }

    // Private passcode check
    if (room.isPrivate && room.passcode) {
      const providedPasscode = passcode?.trim()
      const isHashedPasscode = room.passcode.startsWith('$2')
      const validPasscode = providedPasscode && (
        isHashedPasscode
          ? await bcrypt.compare(providedPasscode, room.passcode)
          : providedPasscode === room.passcode
      )
      if (!providedPasscode || providedPasscode.length > 128 || !validPasscode) {
        throw new AppError(401, 'Invalid passcode for this private room')
      }

      if (!isHashedPasscode) {
        await prisma.room.update({
          where: { id: room.id },
          data: { passcode: await bcrypt.hash(providedPasscode, env.BCRYPT_ROUNDS) },
        })
      }
    }

    // Create membership with default role = PARTICIPANT
    const member = await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId,
        role: RoomRole.PARTICIPANT,
      },
    })

    const details = await roomService.getRoomByCode(normalizedCode, userId)
    return { room: details, member }
  }

  /**
   * Retrieves all members of a room.
   * Verifies requesting user is an authorized member before returning list.
   */
  async getRoomMembers(
    roomIdOrCode: string,
    requestingUserId: string
  ): Promise<RoomMemberSummary[]> {
    // Resolve room by ID or code
    const room = await prisma.room.findFirst({
      where: {
        OR: [{ id: roomIdOrCode }, { roomCode: roomIdOrCode.toUpperCase() }],
      },
      select: { id: true },
    })

    if (!room) {
      throw new AppError(404, 'Room not found')
    }

    // Always retrieve requesting user's membership & role directly from PostgreSQL
    await roomAuthorizationService.requireMembership(room.id, requestingUserId)

    return this.getActiveMembers(room.id)
  }
}

export const roomMemberService = new RoomMemberService()
