import type { ActionStatus, RequestType, RoomRole } from '@prisma/client'
import type { Socket } from 'socket.io'

export interface SocketUser {
  userId: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  authenticatedAt: string
}

export interface SocketData {
  user: SocketUser
  joinedRooms: Map<string, string>
}

export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export interface JoinRoomPayload {
  roomCode: string
}

export interface LeaveRoomPayload {
  roomCode: string
}

export interface RoomPresence {
  roomId: string
  roomCode: string
  userId: string
  username: string
  role: RoomRole
  joinedAt: string
}

export interface RoomState {
  roomId: string
  roomCode: string
  videoId: string | null
  isPlaying: boolean
  currentTime: number
  stateUpdatedAt: string
}

export interface PlaybackPositionPayload {
  roomCode: string
  currentTime?: number
}

export interface ChangeVideoPayload {
  roomCode: string
  videoId: string
}

export interface AssignRolePayload {
  roomCode: string
  targetUserId: string
  role: RoomRole
}

export interface RemoveParticipantPayload {
  roomCode: string
  targetUserId: string
}

export interface TransferHostPayload {
  roomCode: string
  targetUserId: string
  previousHostRole?: RoomRole
}

export interface RequestActionPayload {
  roomCode: string
  requestType: RequestType
  payload?: {
    currentTime?: number
    videoId?: string
  }
}

export interface ReviewRequestPayload {
  roomCode: string
  requestId: string
}

export interface ActionRequestPresence {
  id: string
  roomId: string
  userId: string
  username: string
  requestType: RequestType
  payload: unknown
  status: ActionStatus
  reviewedById: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  username: string
  message: string
  createdAt: string
}

export interface ReactionMessage {
  id: string
  roomId: string
  userId: string
  username: string
  emoji: string
  videoTime: number
  createdAt: string
}

export interface RoomMemberPresence {
  id: string
  role: RoomRole
  joinedAt: string
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}

export interface SocketAck {
  ok: boolean
  error?: string
}

export interface ClientToServerEvents {
  join_room: (payload: JoinRoomPayload, ack?: (response: SocketAck) => void) => void
  leave_room: (payload: LeaveRoomPayload, ack?: (response: SocketAck) => void) => void
  play: (payload: PlaybackPositionPayload, ack?: (response: SocketAck) => void) => void
  pause: (payload: PlaybackPositionPayload, ack?: (response: SocketAck) => void) => void
  seek: (payload: PlaybackPositionPayload, ack?: (response: SocketAck) => void) => void
  change_video: (payload: ChangeVideoPayload, ack?: (response: SocketAck) => void) => void
  assign_role: (payload: AssignRolePayload, ack?: (response: SocketAck) => void) => void
  remove_participant: (
    payload: RemoveParticipantPayload,
    ack?: (response: SocketAck) => void
  ) => void
  transfer_host: (
    payload: TransferHostPayload,
    ack?: (response: SocketAck) => void
  ) => void
  request_action: (
    payload: RequestActionPayload,
    ack?: (response: SocketAck) => void
  ) => void
  get_pending_requests: (
    payload: { roomCode: string },
    ack?: (response: SocketAck) => void
  ) => void
  approve_request: (
    payload: ReviewRequestPayload,
    ack?: (response: SocketAck) => void
  ) => void
  reject_request: (
    payload: ReviewRequestPayload,
    ack?: (response: SocketAck) => void
  ) => void
  send_message: (
    payload: { roomId: string; message: string },
    ack?: (response: SocketAck) => void
  ) => void
  get_recent_messages: (
    payload: { roomId: string; limit?: number },
    ack?: (response: SocketAck) => void
  ) => void
  delete_message: (
    payload: { roomId: string; messageId: string },
    ack?: (response: SocketAck) => void
  ) => void
  send_reaction: (
    payload: { roomId: string; emoji: string; videoTime: number },
    ack?: (response: SocketAck) => void
  ) => void
}

export interface ServerToClientEvents {
  sync_state: (state: RoomState) => void
  user_joined: (presence: RoomPresence) => void
  user_left: (presence: Pick<RoomPresence, 'roomId' | 'roomCode' | 'userId' | 'username'>) => void
  role_assigned: (payload: {
    roomId: string
    roomCode: string
    userId: string
    username: string
    role: RoomRole
  }) => void
  members_updated: (payload: {
    roomId: string
    roomCode: string
    members: RoomMemberPresence[]
  }) => void
  participant_removed: (payload: {
    roomId: string
    roomCode: string
    userId: string
    username: string
    message: string
  }) => void
  host_transferred: (payload: {
    roomId: string
    roomCode: string
    previousHostUserId: string
    newHostUserId: string
    members: RoomMemberPresence[]
  }) => void
  request_created: (request: ActionRequestPresence) => void
  pending_requests: (payload: {
    roomId: string
    roomCode: string
    requests: ActionRequestPresence[]
  }) => void
  request_updated: (payload: {
    request: ActionRequestPresence
    message: string
  }) => void
  new_message: (message: ChatMessage) => void
  recent_messages: (payload: { roomId: string; messages: ChatMessage[] }) => void
  message_deleted: (payload: {
    roomId: string
    messageId: string
    deletedBy: string
  }) => void
  new_reaction: (reaction: ReactionMessage) => void
  socket_error: (error: { event: string; message: string }) => void
}

export interface InterServerEvents {}
