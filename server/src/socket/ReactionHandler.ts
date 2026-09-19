import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { roomAuthorizationService } from '../services/roomAuth.service'
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  InterServerEvents,
  ReactionMessage,
  ServerToClientEvents,
  SocketAck,
} from './types'

const ALLOWED_EMOJIS = new Set(['❤️', '👍', '😂', '🔥', '👏', '😮'])

export class ReactionHandler {
  constructor(
    private readonly io: Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents
    >
  ) {}

  register(socket: AuthenticatedSocket): void {
    socket.on('send_reaction', (payload, ack) => {
      void this.sendReaction(socket, payload, ack)
    })
  }

  private async sendReaction(
    socket: AuthenticatedSocket,
    payload: { roomId: string; emoji: string; videoTime: number },
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = payload?.roomId
      if (!roomId || !socket.data.joinedRooms.has(roomId)) {
        throw new AppError(403, 'Join the room before sending reactions')
      }
      await roomAuthorizationService.requireMembership(roomId, socket.data.user.userId)

      if (!ALLOWED_EMOJIS.has(payload.emoji)) {
        throw new AppError(400, 'That reaction is not allowed')
      }
      if (!Number.isFinite(payload.videoTime) || payload.videoTime < 0) {
        throw new AppError(400, 'Reaction timestamp must be a non-negative number')
      }

      const reaction = await prisma.reaction.create({
        data: {
          roomId,
          userId: socket.data.user.userId,
          emoji: payload.emoji,
          videoTime: payload.videoTime,
        },
      })
      const reactionMessage: ReactionMessage = {
        id: reaction.id,
        roomId: reaction.roomId,
        userId: reaction.userId,
        username: socket.data.user.username,
        emoji: reaction.emoji,
        videoTime: reaction.videoTime,
        createdAt: reaction.createdAt.toISOString(),
      }
      this.io.to(roomId).emit('new_reaction', reactionMessage)
      ack?.({ ok: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reaction failed'
      socket.emit('socket_error', { event: 'send_reaction', message })
      ack?.({ ok: false, error: message })
    }
  }
}
