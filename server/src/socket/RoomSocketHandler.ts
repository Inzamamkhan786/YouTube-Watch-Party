import { roomAuthorizationService } from '../services/roomAuth.service'
import { roomService } from '../services/room.service'
import { playbackService } from '../services/playback.service'
import { roomMemberService } from '../services/roomMember.service'
import type {
  AuthenticatedSocket,
  JoinRoomPayload,
  LeaveRoomPayload,
  RoomPresence,
  RoomState,
  SocketAck,
} from './types'

export class RoomSocketHandler {
  register(socket: AuthenticatedSocket): void {
    socket.on('join_room', (payload, ack) => {
      void this.joinRoom(socket, payload, ack)
    })

    socket.on('leave_room', (payload, ack) => {
      void this.leaveRoom(socket, payload, ack)
    })

    socket.on('disconnecting', () => {
      void this.leaveAllRooms(socket)
    })
  }

  private async joinRoom(
    socket: AuthenticatedSocket,
    payload: JoinRoomPayload,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    try {
      const roomCode = payload?.roomCode?.trim().toUpperCase()
      if (!roomCode) {
        throw new Error('Room code is required')
      }

      const room = await roomService.getRoomByCode(roomCode, socket.data.user.userId)
      const member = await roomAuthorizationService.requireMembership(
        room.id,
        socket.data.user.userId
      )
      const alreadyJoined = socket.data.joinedRooms.has(room.id)

      await socket.join(room.id)
      socket.data.joinedRooms.set(room.id, room.roomCode)

      const state: RoomState = {
        ...playbackService.getState(room),
      }
      socket.emit('sync_state', state)
      socket.emit('members_updated', {
        roomId: room.id,
        roomCode: room.roomCode,
        members: (await roomMemberService.getActiveMembers(room.id)).map((activeMember) => ({
          id: activeMember.id,
          role: activeMember.role,
          joinedAt: activeMember.joinedAt.toISOString(),
          user: {
            ...activeMember.user,
            displayName: activeMember.user.displayName ?? null,
            avatarUrl: activeMember.user.avatarUrl ?? null,
          },
        })),
      })

      if (!alreadyJoined) {
        const presence: RoomPresence = {
          roomId: room.id,
          roomCode: room.roomCode,
          userId: socket.data.user.userId,
          username: socket.data.user.username,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
        }
        socket.to(room.id).emit('user_joined', presence)
      }
      ack?.({ ok: true })
    } catch (error) {
      this.emitError(socket, 'join_room', error)
      ack?.({ ok: false, error: this.errorMessage(error) })
    }
  }

  private async leaveRoom(
    socket: AuthenticatedSocket,
    payload: LeaveRoomPayload,
    ack?: (response: SocketAck) => void
  ): Promise<void> {
    const roomCode = payload?.roomCode?.trim().toUpperCase()
    const roomEntry = [...socket.data.joinedRooms.entries()].find(
      ([, joinedRoomCode]) => joinedRoomCode === roomCode
    )

    if (!roomEntry) {
      ack?.({ ok: true })
      return
    }

    await this.removeSocketFromRoom(socket, roomEntry[0], roomCode)
    ack?.({ ok: true })
  }

  private async leaveAllRooms(socket: AuthenticatedSocket): Promise<void> {
    const rooms = [...socket.data.joinedRooms.entries()]
    for (const [roomId, roomCode] of rooms) {
      await this.removeSocketFromRoom(socket, roomId, roomCode)
    }
  }

  private async removeSocketFromRoom(
    socket: AuthenticatedSocket,
    roomId: string,
    roomCode: string
  ): Promise<void> {
    socket.data.joinedRooms.delete(roomId)
    await socket.leave(roomId)
    socket.to(roomId).emit('user_left', {
      roomId,
      roomCode,
      userId: socket.data.user.userId,
      username: socket.data.user.username,
    })
  }

  private emitError(socket: AuthenticatedSocket, event: string, error: unknown): void {
    socket.emit('socket_error', {
      event,
      message: this.errorMessage(error),
    })
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Socket operation failed'
  }
}
