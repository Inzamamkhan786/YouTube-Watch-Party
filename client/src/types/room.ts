export type RoomRole = 'HOST' | 'MODERATOR' | 'PARTICIPANT' | 'VIEWER'

export interface RoomHostInfo {
  id: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
}

export interface CurrentUserMembership {
  role: RoomRole
  isMuted: boolean
  joinedAt: string
}

export interface Room {
  id: string
  roomCode: string
  title: string
  description?: string | null
  isPrivate: boolean
  maxMembers: number
  hostId: string
  currentVideoId?: string | null
  isPlaying: boolean
  currentTime: number
  stateUpdatedAt: string
  createdAt: string
  updatedAt: string
  host: RoomHostInfo
  _count: {
    members: number
  }
  currentUserMembership?: CurrentUserMembership | null
}

export interface RoomMemberSummary {
  id: string
  role: RoomRole
  joinedAt: string
  user: {
    id: string
    username: string
    displayName?: string | null
    avatarUrl?: string | null
  }
}

export interface CreateRoomInput {
  title: string
  description?: string
  isPrivate?: boolean
  passcode?: string
  maxMembers?: number
  initialVideoId?: string
}

export interface JoinRoomInput {
  roomCode: string
  passcode?: string
}
