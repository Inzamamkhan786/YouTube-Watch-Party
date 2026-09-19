import { io, type Socket } from 'socket.io-client'
import { API_BASE_URL } from '../utils/constants'

export type SocketConnectionStatus =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'DISCONNECTED'
  | 'RECONNECTING'

export interface RoomSocketState {
  roomId: string
  roomCode: string
  videoId: string | null
  isPlaying: boolean
  currentTime: number
  stateUpdatedAt: string
}

export interface RoomPresence {
  roomId: string
  roomCode: string
  userId: string
  username: string
  role: 'HOST' | 'MODERATOR' | 'PARTICIPANT' | 'VIEWER'
  joinedAt: string
}

export interface RoomLeftPresence {
  roomId: string
  roomCode: string
  userId: string
  username: string
}

export interface RoomSocketMember {
  id: string
  role: 'HOST' | 'MODERATOR' | 'PARTICIPANT' | 'VIEWER'
  joinedAt: string
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}

export type RequestType =
  | 'REQUEST_PLAY'
  | 'REQUEST_PAUSE'
  | 'REQUEST_SEEK'
  | 'REQUEST_CHANGE_VIDEO'

export type ActionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface ActionRequest {
  id: string
  roomId: string
  userId: string
  username: string
  requestType: RequestType
  payload: unknown
  status: ActionRequestStatus
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

export interface RoomSocketServerEvents {
  sync_state: (state: RoomSocketState) => void
  user_joined: (presence: RoomPresence) => void
  user_left: (presence: RoomLeftPresence) => void
  role_assigned: (payload: {
    roomId: string
    roomCode: string
    userId: string
    username: string
    role: RoomSocketMember['role']
  }) => void
  members_updated: (payload: {
    roomId: string
    roomCode: string
    members: RoomSocketMember[]
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
    members: RoomSocketMember[]
  }) => void
  request_created: (request: ActionRequest) => void
  pending_requests: (payload: {
    roomId: string
    roomCode: string
    requests: ActionRequest[]
  }) => void
  request_updated: (payload: {
    request: ActionRequest
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

export interface RoomSocketClientEvents {
  join_room: (
    payload: { roomCode: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  leave_room: (
    payload: { roomCode: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  play: (
    payload: { roomCode: string; currentTime?: number },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  pause: (
    payload: { roomCode: string; currentTime?: number },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  seek: (
    payload: { roomCode: string; currentTime: number },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  change_video: (
    payload: { roomCode: string; videoId: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  assign_role: (
    payload: {
      roomCode: string
      targetUserId: string
      role: RoomSocketMember['role']
    },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  remove_participant: (
    payload: { roomCode: string; targetUserId: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  transfer_host: (
    payload: {
      roomCode: string
      targetUserId: string
      previousHostRole?: 'MODERATOR' | 'PARTICIPANT'
    },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  request_action: (
    payload: {
      roomCode: string
      requestType: RequestType
      payload?: { currentTime?: number; videoId?: string }
    },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  get_pending_requests: (
    payload: { roomCode: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  approve_request: (
    payload: { roomCode: string; requestId: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  reject_request: (
    payload: { roomCode: string; requestId: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  send_message: (
    payload: { roomId: string; message: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  get_recent_messages: (
    payload: { roomId: string; limit?: number },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  delete_message: (
    payload: { roomId: string; messageId: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
  send_reaction: (
    payload: { roomId: string; emoji: string; videoTime: number },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void
}

export type RoomSocket = Socket<
  RoomSocketServerEvents,
  RoomSocketClientEvents
>

export function createRoomSocket(token: string): RoomSocket {
  return io(API_BASE_URL || undefined, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.25,
    timeout: 10000,
  })
}
