import bcrypt from 'bcryptjs'
import { RoomRole, type Room } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { generateRoomCode } from '../utils/roomCode'
import { AppError } from '../middleware/errorHandler'
import { env } from '../config/env'

export interface CreateRoomInput {
  title: string
  description?: string
  isPrivate?: boolean
  passcode?: string
  maxMembers?: number
  initialVideoId: string
}

export interface RoomHostInfo {
  id: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
}

export interface RoomDetails extends Room {
  host: RoomHostInfo
  _count: {
    members: number
  }
  currentUserMembership?: {
    role: RoomRole
    isMuted: boolean
    joinedAt: Date
  } | null
}

export class RoomService {
  /**
   * Generates a unique room code, ensuring no collisions.
   */
  private async generateUniqueCode(): Promise<string> {
    for (let attempts = 0; attempts < 5; attempts++) {
      const code = generateRoomCode()
      const exists = await prisma.room.findUnique({
        where: { roomCode: code },
        select: { id: true },
      })
      if (!exists) {
        return code
      }
    }
    throw new AppError(500, 'Failed to allocate a unique room code. Please try again.')
  }

  /**
   * Creates a new room.
   * The creating user automatically becomes HOST.
   */
  async createRoom(hostUserId: string, input: CreateRoomInput): Promise<RoomDetails> {
    const title = input.title?.trim()
    if (!title || title.length < 2 || title.length > 120) {
      throw new AppError(400, 'Room title must be between 2 and 120 characters long')
    }

    if (input.description && input.description.length > 1000) {
      throw new AppError(400, 'Room description cannot exceed 1000 characters')
    }

    if (
      input.maxMembers !== undefined &&
      (!Number.isInteger(input.maxMembers) || input.maxMembers < 1 || input.maxMembers > 1000)
    ) {
      throw new AppError(400, 'Maximum members must be between 1 and 1000')
    }

    const normalizedVideoId = input.initialVideoId?.trim()

    if (!normalizedVideoId || !/^[A-Za-z0-9_-]{11}$/.test(normalizedVideoId)) {
      throw new AppError(400, 'An initial YouTube video is required when creating a room')
    }

    if (
      input.isPrivate &&
      (!input.passcode || input.passcode.trim().length < 4 || input.passcode.trim().length > 128)
    ) {
      throw new AppError(400, 'Private rooms require a passcode of at least 4 characters')
    }

    const hashedPasscode = input.passcode
      ? await bcrypt.hash(input.passcode.trim(), env.BCRYPT_ROUNDS)
      : null

    const roomCode = await this.generateUniqueCode()

    // Transaction ensures both Room and RoomMember(HOST) are atomically created
    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          roomCode,
          title,
          description: input.description?.trim() ?? null,
          isPrivate: Boolean(input.isPrivate),
          passcode: hashedPasscode,
          maxMembers: input.maxMembers && input.maxMembers > 0 ? input.maxMembers : 50,
          hostId: hostUserId,
          currentVideoId: normalizedVideoId,
          isPlaying: false,
          currentTime: 0.0,
          stateUpdatedAt: new Date(),
        },
        include: {
          host: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: { members: true },
          },
        },
      })

      // Creator automatically becomes HOST
      await tx.roomMember.create({
        data: {
          roomId: room.id,
          userId: hostUserId,
          role: RoomRole.HOST,
        },
      })

      return room
    })

    return {
      ...result,
      _count: { members: 1 },
      currentUserMembership: {
        role: RoomRole.HOST,
        isMuted: false,
        joinedAt: new Date(),
      },
    }
  }

  /**
   * Fetches room by roomCode, including host info and current user's membership.
   */
  async getRoomByCode(roomCode: string, userId?: string): Promise<RoomDetails> {
    const normalizedCode = roomCode.trim().toUpperCase()

    const room = await prisma.room.findUnique({
      where: { roomCode: normalizedCode },
      include: {
        host: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            members: {
              where: { isBanned: false },
            },
          },
        },
      },
    })

    if (!room) {
      throw new AppError(404, `Room with code '${normalizedCode}' was not found`)
    }

    let currentUserMembership = null
    if (userId) {
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId,
          },
        },
        select: {
          role: true,
          isMuted: true,
          isBanned: true,
          joinedAt: true,
        },
      })

      if (member && !member.isBanned) {
        currentUserMembership = {
          role: member.role,
          isMuted: member.isMuted,
          joinedAt: member.joinedAt,
        }
      }
    }

    // Mask passcode from public responses
    const sanitizedRoom = { ...room }
    if (sanitizedRoom.passcode) {
      sanitizedRoom.passcode = '[PROTECTED]'
    }

    return {
      ...sanitizedRoom,
      currentUserMembership,
    }
  }

  /**
   * Fetches room by UUID.
   */
  async getRoomById(roomId: string): Promise<Room | null> {
    return prisma.room.findUnique({
      where: { id: roomId },
    })
  }
}

export const roomService = new RoomService()
