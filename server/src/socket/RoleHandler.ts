import { RoomRole } from '@prisma/client'
import type { Server } from 'socket.io'
import { AppError } from '../middleware/errorHandler'
import { roomAuthorizationService } from '../services/roomAuth.service'
import type { RoomMemberSummary } from '../services/roomMember.service'
import { roomRoleService } from '../services/roomRole.service'
import type {
  AssignRolePayload,
  AuthenticatedSocket,
  ClientToServerEvents,
  InterServerEvents,
  RemoveParticipantPayload,
  RoomMemberPresence,
  ServerToClientEvents,
  SocketAck,
  TransferHostPayload,
} from './types'

const HOST_ONLY = [RoomRole.HOST]

export class RoleHandler {
  constructor(
    private readonly io: Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents
    >
  ) {}

  register(socket: AuthenticatedSocket): void {
    socket.on('assign_role', (payload, ack) => {
      void this.assignRole(socket, payload, ack)
    })
    socket.on('remove_participant', (payload, ack) => {
      void this.removeParticipant(socket, payload, ack)
    })
    socket.on('transfer_host', (payload, ack) => {
      void this.transferHost(socket, payload, ack)
    })
  }

  private async assignRole(
    socket: AuthenticatedSocket,
    payload: AssignRolePayload,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = await this.requireHostRoom(socket, payload?.roomCode)
      if (
        payload.role !== RoomRole.MODERATOR &&
        payload.role !== RoomRole.PARTICIPANT
      ) {
        throw new AppError(400, 'Only MODERATOR or PARTICIPANT can be assigned')
      }

      const members = await roomRoleService.assignRole(
        roomId,
        payload.targetUserId,
        payload.role
      )
      const target = members.find((member) => member.user.id === payload.targetUserId)
      if (!target) throw new AppError(404, 'Updated participant was not found')

      this.broadcastRoleAssigned(socket, roomId, target, members)
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'assign_role', error, ack)
    }
  }

  private async removeParticipant(
    socket: AuthenticatedSocket,
    payload: RemoveParticipantPayload,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = await this.requireHostRoom(socket, payload?.roomCode)
      const result = await roomRoleService.removeParticipant(roomId, payload.targetUserId)
      const targetSocket = this.findSockets(roomId, payload.targetUserId)
      const targetUser = result.member.userId
      const roomCode = this.getRoomCode(socket, roomId)
      const removed = {
        roomId,
        roomCode,
        userId: targetUser,
        username: targetSocket[0]?.data.user.username ?? targetUser,
        message: 'You were removed from this room by the host.',
      }

      for (const target of targetSocket) {
        target.emit('participant_removed', removed)
        target.data.joinedRooms.delete(roomId)
        await target.leave(roomId)
        target.disconnect(true)
      }

      this.io.to(roomId).emit('participant_removed', removed)
      this.io.to(roomId).emit('members_updated', {
        roomId,
        roomCode,
        members: this.serializeMembers(result.members),
      })
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'remove_participant', error, ack)
    }
  }

  private async transferHost(
    socket: AuthenticatedSocket,
    payload: TransferHostPayload,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomId = await this.requireHostRoom(socket, payload?.roomCode)
      const members = await roomRoleService.transferHost(
        roomId,
        socket.data.user.userId,
        payload.targetUserId,
        payload.previousHostRole
      )
      const roomCode = this.getRoomCode(socket, roomId)
      const target = members.find((member) => member.user.id === payload.targetUserId)
      if (!target) throw new AppError(404, 'New host was not found')

      const assigned = members.filter(
        (member) =>
          member.user.id === socket.data.user.userId ||
          member.user.id === payload.targetUserId
      )
      for (const member of assigned) {
        this.io.to(roomId).emit('role_assigned', {
          roomId,
          roomCode,
          userId: member.user.id,
          username: member.user.username,
          role: member.role,
        })
      }
      this.io.to(roomId).emit('host_transferred', {
        roomId,
        roomCode,
        previousHostUserId: socket.data.user.userId,
        newHostUserId: payload.targetUserId,
        members: this.serializeMembers(members),
      })
      ack?.({ ok: true })
    } catch (error) {
      this.fail(socket, 'transfer_host', error, ack)
    }
  }

  private async requireHostRoom(
    socket: AuthenticatedSocket,
    roomCode?: string
  ): Promise<string> {
    const normalizedCode = roomCode?.trim().toUpperCase()
    const room = normalizedCode
      ? [...socket.data.joinedRooms.entries()].find(
          ([, joinedRoomCode]) => joinedRoomCode === normalizedCode
        )
      : undefined
    if (!room) throw new AppError(403, 'Join the room before managing members')

    await roomAuthorizationService.requireRole(
      room[0],
      socket.data.user.userId,
      HOST_ONLY
    )
    return room[0]
  }

  private getRoomCode(socket: AuthenticatedSocket, roomId: string): string {
    const roomCode = socket.data.joinedRooms.get(roomId)
    if (!roomCode) throw new AppError(404, 'Room session not found')
    return roomCode
  }

  private findSockets(roomId: string, userId: string): AuthenticatedSocket[] {
    return [...this.io.sockets.sockets.values()].filter((candidate) => {
      const authenticated = candidate as AuthenticatedSocket
      return (
        authenticated.data.user.userId === userId &&
        authenticated.data.joinedRooms.has(roomId)
      )
    }) as AuthenticatedSocket[]
  }

  private broadcastRoleAssigned(
    socket: AuthenticatedSocket,
    roomId: string,
    target: RoomMemberSummary,
    members: RoomMemberSummary[]
  ): void {
    const roomCode = this.getRoomCode(socket, roomId)
    this.io.to(roomId).emit('role_assigned', {
      roomId,
      roomCode,
      userId: target.user.id,
      username: target.user.username,
      role: target.role,
    })
    this.io.to(roomId).emit('members_updated', {
      roomId,
      roomCode,
      members: this.serializeMembers(members),
    })
  }

  private serializeMembers(members: RoomMemberSummary[]): RoomMemberPresence[] {
    return members.map((member) => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      user: {
        ...member.user,
        displayName: member.user.displayName ?? null,
        avatarUrl: member.user.avatarUrl ?? null,
      },
    }))
  }

  private fail(
    socket: AuthenticatedSocket,
    event: string,
    error: unknown,
    ack?: (response: SocketAck) => void
  ): void {
    const message = error instanceof Error ? error.message : 'Role operation failed'
    socket.emit('socket_error', { event, message })
    ack?.({ ok: false, error: message })
  }
}
