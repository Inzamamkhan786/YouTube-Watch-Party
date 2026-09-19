import { apiClient } from './api'
import type { ApiResponse } from '../types/api'
import type {
  Room,
  RoomMemberSummary,
  CreateRoomInput,
} from '../types/room'

/**
 * Creates a new room. Authenticated user becomes HOST.
 */
export async function createRoomApi(input: CreateRoomInput): Promise<Room> {
  const { data } = await apiClient.post<ApiResponse<{ room: Room }>>(
    '/api/rooms',
    input
  )
  if (!data.data?.room) {
    throw new Error(data.error ?? 'Failed to create room')
  }
  return data.data.room
}

/**
 * Fetches room details by room code.
 */
export async function getRoomApi(roomCode: string): Promise<Room> {
  const { data } = await apiClient.get<ApiResponse<{ room: Room }>>(
    `/api/rooms/${encodeURIComponent(roomCode.trim().toUpperCase())}`
  )
  if (!data.data?.room) {
    throw new Error(data.error ?? 'Room not found')
  }
  return data.data.room
}

/**
 * Joins a room using the room code (or room link).
 */
export async function joinRoomApi(
  roomCode: string,
  passcode?: string
): Promise<{ room: Room }> {
  const { data } = await apiClient.post<ApiResponse<{ room: Room }>>(
    `/api/rooms/${encodeURIComponent(roomCode.trim().toUpperCase())}/join`,
    { passcode }
  )
  if (!data.data?.room) {
    throw new Error(data.error ?? 'Failed to join room')
  }
  return data.data
}

/**
 * Retrieves members of a room.
 */
export async function getRoomMembersApi(
  roomIdOrCode: string
): Promise<RoomMemberSummary[]> {
  const { data } = await apiClient.get<ApiResponse<{ members: RoomMemberSummary[] }>>(
    `/api/rooms/${encodeURIComponent(roomIdOrCode)}/members`
  )
  if (!data.data?.members) {
    throw new Error(data.error ?? 'Failed to fetch room members')
  }
  return data.data.members
}
