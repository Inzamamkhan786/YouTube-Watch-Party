import { RoomRole } from '@prisma/client'
import type { Server } from 'socket.io'
import { AppError } from '../middleware/errorHandler'
import { roomAuthorizationService } from '../services/roomAuth.service'
import { playbackService, type PlaybackAction } from '../services/playback.service'
import type {
  AuthenticatedSocket,
  ChangeVideoPayload,
  ClientToServerEvents,
  InterServerEvents,
  PlaybackPositionPayload,
  ServerToClientEvents,
  SocketAck,
} from './types'

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const CONTROL_ROLES = [RoomRole.HOST, RoomRole.MODERATOR]
type PlaybackEvent = 'play' | 'pause' | 'seek' | 'change_video'

export class PlaybackHandler {
  constructor(
    private readonly io: Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents
    >
  ) {}

  register(socket: AuthenticatedSocket): void {
    socket.on('play', (payload, ack) => {
      void this.handle(socket, 'play', payload, ack)
    })
    socket.on('pause', (payload, ack) => {
      void this.handle(socket, 'pause', payload, ack)
    })
    socket.on('seek', (payload, ack) => {
      void this.handle(socket, 'seek', payload, ack)
    })
    socket.on('change_video', (payload, ack) => {
      void this.handle(socket, 'change_video', payload, ack)
    })
  }

  private async handle(
    socket: AuthenticatedSocket,
    event: PlaybackEvent,
    payload: PlaybackPositionPayload | ChangeVideoPayload,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = this.getJoinedRoomId(socket, payload?.roomCode)

      // Resolve the current role from PostgreSQL for every playback event.
      await roomAuthorizationService.requireRole(
        roomId,
        socket.data.user.userId,
        CONTROL_ROLES
      )

      const action = this.toAction(event, payload)
      const state = await playbackService.update(roomId, action)
      this.io.to(roomId).emit('sync_state', state)
      ack?.({ ok: true })
    } catch (error) {
      const message = this.errorMessage(error)
      socket.emit('socket_error', { event, message })
      ack?.({ ok: false, error: message })
    }
  }

  private getJoinedRoomId(socket: AuthenticatedSocket, roomCode?: string): string {
    const normalizedCode = roomCode?.trim().toUpperCase()
    if (!normalizedCode) {
      throw new AppError(400, 'Room code is required')
    }

    const room = [...socket.data.joinedRooms.entries()].find(
      ([, joinedRoomCode]) => joinedRoomCode === normalizedCode
    )
    if (!room) {
      throw new AppError(403, 'Join the room before controlling playback')
    }

    return room[0]
  }

  private toAction(
    event: PlaybackEvent,
    payload: PlaybackPositionPayload | ChangeVideoPayload
  ): PlaybackAction {
    if (event === 'change_video') {
      const videoId = (payload as ChangeVideoPayload).videoId?.trim()
      if (!videoId || !YOUTUBE_VIDEO_ID.test(videoId)) {
        throw new AppError(400, 'Invalid YouTube video ID')
      }
      return { type: event, videoId } as const
    }

    const currentTime = (payload as PlaybackPositionPayload).currentTime
    if (currentTime !== undefined && (!Number.isFinite(currentTime) || currentTime < 0)) {
      throw new AppError(400, 'Playback time must be a non-negative number')
    }
    if (event === 'seek' && currentTime === undefined) {
      throw new AppError(400, 'Seek requires a playback time')
    }

    if (event === 'seek') {
      return { type: 'seek', currentTime: currentTime as number }
    }

    if (event === 'play') {
      return { type: 'play', currentTime }
    }

    return { type: 'pause', currentTime }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Playback operation failed'
  }
}
