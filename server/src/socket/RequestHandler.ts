import { RoomRole } from '@prisma/client'
import type { Server } from 'socket.io'
import { AppError } from '../middleware/errorHandler'
import { actionRequestService } from '../services/actionRequest.service'
import { roomAuthorizationService } from '../services/roomAuth.service'
import type {
  ActionRequestPresence,
  AuthenticatedSocket,
  ClientToServerEvents,
  InterServerEvents,
  RequestActionPayload,
  ReviewRequestPayload,
  ServerToClientEvents,
  SocketAck,
} from './types'

export class RequestHandler {
  constructor(
    private readonly io: Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents
    >
  ) {}

  register(socket: AuthenticatedSocket): void {
    socket.on('request_action', (payload, ack) => {
      void this.createRequest(socket, payload, ack)
    })
    socket.on('get_pending_requests', (payload, ack) => {
      void this.sendPendingRequests(socket, payload.roomCode, ack)
    })
    socket.on('approve_request', (payload, ack) => {
      void this.approveRequest(socket, payload, ack)
    })
    socket.on('reject_request', (payload, ack) => {
      void this.rejectRequest(socket, payload, ack)
    })
  }

  private async createRequest(
    socket: AuthenticatedSocket,
    payload: RequestActionPayload,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = this.getJoinedRoomId(socket, payload?.roomCode)
      const request = await actionRequestService.createRequest(
        roomId,
        socket.data.user.userId,
        payload.requestType,
        payload.payload ?? null
      )
      socket.emit('request_created', request)
      await this.broadcastToReviewers(roomId, 'request_created', request)
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'request_action', error, ack)
    }
  }

  private async sendPendingRequests(
    socket: AuthenticatedSocket,
    roomCode: string,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = this.getJoinedRoomId(socket, roomCode)
      const requests = await actionRequestService.getPendingRequests(
        roomId,
        socket.data.user.userId
      )
      socket.emit('pending_requests', {
        roomId,
        roomCode: this.getRoomCode(socket, roomId),
        requests,
      })
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'get_pending_requests', error, ack)
    }
  }

  private async approveRequest(
    socket: AuthenticatedSocket,
    payload: ReviewRequestPayload,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = this.getJoinedRoomId(socket, payload?.roomCode)
      const result = await actionRequestService.approveRequest(
        roomId,
        payload.requestId,
        socket.data.user.userId
      )
      this.io.to(roomId).emit('sync_state', result.state)
      this.io.to(roomId).emit('request_updated', {
        request: result.request,
        message: `Request from ${result.request.username} was approved.`,
      })
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'approve_request', error, ack)
    }
  }

  private async rejectRequest(
    socket: AuthenticatedSocket,
    payload: ReviewRequestPayload,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = this.getJoinedRoomId(socket, payload?.roomCode)
      const request = await actionRequestService.rejectRequest(
        roomId,
        payload.requestId,
        socket.data.user.userId
      )
      this.io.to(roomId).emit('request_updated', {
        request,
        message: `Request from ${request.username} was rejected.`,
      })
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'reject_request', error, ack)
    }
  }

  private async broadcastToReviewers(
    roomId: string,
    event: 'request_created',
    request: ActionRequestPresence
  ): Promise<void> {
    const sockets = [...this.io.sockets.sockets.values()]
    await Promise.all(
      sockets.map(async (candidate) => {
        const socket = candidate as AuthenticatedSocket
        if (!socket.data.joinedRooms.has(roomId)) return
        const member = await roomAuthorizationService.getMember(
          roomId,
          socket.data.user.userId
        )
        if (
          member &&
          !member.isBanned &&
          (member.role === RoomRole.HOST || member.role === RoomRole.MODERATOR)
        ) {
          socket.emit(event, request)
        }
      })
    )
  }

  private getJoinedRoomId(socket: AuthenticatedSocket, roomCode?: string): string {
    const normalizedCode = roomCode?.trim().toUpperCase()
    const room = normalizedCode
      ? [...socket.data.joinedRooms.entries()].find(
          ([, joinedRoomCode]) => joinedRoomCode === normalizedCode
        )
      : undefined
    if (!room) throw new AppError(403, 'Join the room before using action requests')
    return room[0]
  }

  private getRoomCode(socket: AuthenticatedSocket, roomId: string): string {
    const roomCode = socket.data.joinedRooms.get(roomId)
    if (!roomCode) throw new AppError(404, 'Room session not found')
    return roomCode
  }

  private fail(
    socket: AuthenticatedSocket,
    event: string,
    error: unknown,
    ack?: (response: SocketAck) => void
  ): void {
    const message = error instanceof Error ? error.message : 'Action request failed'
    socket.emit('socket_error', { event, message })
    ack?.({ ok: false, error: message })
  }
}
