import { apiClient } from './api'

/**
 * Creates a new room. Authenticated user becomes HOST.
 */
export async function createRoomApi(input) {
  const { data } = await apiClient.post('/api/rooms', input)
  if (!data.data?.room) {
    throw new Error(data.error ?? 'Failed to create room')
  }
  return data.data.room
}

/**
 * Fetches room details by room code.
 */
export async function getRoomApi(roomCode) {
  const { data } = await apiClient.get(
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
export async function joinRoomApi(roomCode, passcode) {
  const { data } = await apiClient.post(
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
export async function getRoomMembersApi(roomIdOrCode) {
  const { data } = await apiClient.get(
    `/api/rooms/${encodeURIComponent(roomIdOrCode)}/members`
  )
  if (!data.data?.members) {
    throw new Error(data.error ?? 'Failed to fetch room members')
  }
  return data.data.members
}
