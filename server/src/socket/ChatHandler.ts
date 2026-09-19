import { RoomRole } from '@prisma/client'
import type { Server } from 'socket.io'
import { AppError } from '../middleware/errorHandler'
import { prisma } from '../lib/prisma'
import { roomAuthorizationService } from '../services/roomAuth.service'
import type {
  AuthenticatedSocket,
  ChatMessage,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketAck,
} from './types'

const MAX_MESSAGE_LENGTH = 2000

export class ChatHandler {
  constructor(
    private readonly io: Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents
    >
  ) {}

  register(socket: AuthenticatedSocket): void {
    socket.on('send_message', (payload, ack) => {
      void this.sendMessage(socket, payload, ack)
    })
    socket.on('get_recent_messages', (payload, ack) => {
      void this.getRecentMessages(socket, payload, ack)
    })
    socket.on('delete_message', (payload, ack) => {
      void this.deleteMessage(socket, payload, ack)
    })
  }

  private async sendMessage(
    socket: AuthenticatedSocket,
    payload: { roomId: string; message: string },
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = this.requireJoinedRoom(socket, payload?.roomId)
      await roomAuthorizationService.requireMembership(roomId, socket.data.user.userId)
      const message = this.validateMessage(payload?.message)
      const created = await prisma.message.create({
        data: {
          roomId,
          userId: socket.data.user.userId,
          content: message,
        },
      })
      const chatMessage = this.toChatMessage(created, socket.data.user.username)
      this.io.to(roomId).emit('new_message', chatMessage)
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'send_message', error, ack)
    }
  }

  private async getRecentMessages(
    socket: AuthenticatedSocket,
    payload: { roomId: string; limit?: number },
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = this.requireJoinedRoom(socket, payload?.roomId)
      await roomAuthorizationService.requireMembership(roomId, socket.data.user.userId)
      const limit = Math.min(Math.max(Math.floor(payload.limit ?? 50), 1), 100)
      const messages = await prisma.message.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: { select: { username: true } } },
      })
      socket.emit('recent_messages', {
        roomId,
        messages: messages.reverse().map((message) =>
          this.toChatMessage(message, message.user.username)
        ),
      })
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'get_recent_messages', error, ack)
    }
  }

  private async deleteMessage(
    socket: AuthenticatedSocket,
    payload: { roomId: string; messageId: string },
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = this.requireJoinedRoom(socket, payload?.roomId)
      const member = await roomAuthorizationService.requireMembership(
        roomId,
        socket.data.user.userId
      )
      const message = await prisma.message.findUnique({
        where: { id: payload.messageId },
      })
      if (!message || message.roomId !== roomId) {
        throw new AppError(404, 'Message not found')
      }
      const isModerator = member.role === RoomRole.HOST || member.role === RoomRole.MODERATOR
      if (message.userId !== socket.data.user.userId && !isModerator) {
        throw new AppError(403, 'Only hosts and moderators can delete another user message')
      }

      await prisma.message.delete({ where: { id: message.id } })
      this.io.to(roomId).emit('message_deleted', {
        roomId,
        messageId: message.id,
        deletedBy: socket.data.user.userId,
      })
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'delete_message', error, ack)
    }
  }

  private requireJoinedRoom(socket: AuthenticatedSocket, roomId?: string): string {
    if (!roomId || !socket.data.joinedRooms.has(roomId)) {
      throw new AppError(403, 'Join the room before using chat')
    }
    return roomId
  }

  private validateMessage(message?: string): string {
    const trimmed = message?.trim()
    if (!trimmed) throw new AppError(400, 'Message cannot be empty')
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(400, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
    }
    return trimmed
  }

  private toChatMessage(
    message: { id: string; roomId: string; userId: string; content: string; createdAt: Date },
    username: string
  ): ChatMessage {
    return {
      id: message.id,
      roomId: message.roomId,
      userId: message.userId,
      username,
      message: message.content,
      createdAt: message.createdAt.toISOString(),
    }
  }

  private fail(
    socket: AuthenticatedSocket,
    event: string,
    error: unknown,
    ack?: (response: SocketAck) => void
  ): void {
    const message = error instanceof Error ? error.message : 'Chat operation failed'
    socket.emit('socket_error', { event, message })
    ack?.({ ok: false, error: message })
  }
}
