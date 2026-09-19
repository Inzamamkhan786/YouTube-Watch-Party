import { Prisma, type Room } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export interface PlaybackState {
  roomId: string
  roomCode: string
  videoId: string | null
  isPlaying: boolean
  currentTime: number
  stateUpdatedAt: string
}

export type PlaybackAction =
  | { type: 'play'; currentTime?: number }
  | { type: 'pause'; currentTime?: number }
  | { type: 'seek'; currentTime: number }
  | { type: 'change_video'; videoId: string }

type PlaybackDb = PrismaClientLike | Prisma.TransactionClient
type PrismaClientLike = Pick<typeof prisma, 'room'>

export class PlaybackService {
  getState(room: Pick<Room, 'id' | 'roomCode' | 'currentVideoId' | 'isPlaying' | 'currentTime' | 'stateUpdatedAt'>): PlaybackState {
    return {
      roomId: room.id,
      roomCode: room.roomCode,
      videoId: room.currentVideoId,
      isPlaying: room.isPlaying,
      currentTime: this.getEffectiveTime(room),
      stateUpdatedAt: room.stateUpdatedAt.toISOString(),
    }
  }

  async update(
    roomId: string,
    action: PlaybackAction,
    db: PlaybackDb = prisma
  ): Promise<PlaybackState> {
    const room = await db.room.findUnique({ where: { id: roomId } })
    if (!room) {
      throw new AppError(404, 'Room not found')
    }

    const now = new Date()
    const currentTime =
      'currentTime' in action && action.currentTime !== undefined
        ? action.currentTime
        : this.getEffectiveTime(room)

    if (action.type !== 'change_video' && !room.currentVideoId) {
      throw new AppError(400, 'Load a video before changing playback state')
    }

    const updated = await db.room.update({
      where: { id: roomId },
      data: {
        ...(action.type === 'change_video' && {
          currentVideoId: action.videoId,
          isPlaying: false,
          currentTime: 0,
        }),
        ...(action.type === 'play' && {
          isPlaying: true,
          currentTime,
        }),
        ...(action.type === 'pause' && {
          isPlaying: false,
          currentTime,
        }),
        ...(action.type === 'seek' && {
          currentTime,
        }),
        stateUpdatedAt: now,
      },
    })

    return this.getState(updated)
  }

  private getEffectiveTime(
    room: Pick<Room, 'isPlaying' | 'currentTime' | 'stateUpdatedAt'>
  ): number {
    if (!room.isPlaying) {
      return room.currentTime
    }

    const elapsedSeconds = (Date.now() - room.stateUpdatedAt.getTime()) / 1000
    return Math.max(0, room.currentTime + elapsedSeconds)
  }
}

export const playbackService = new PlaybackService()
