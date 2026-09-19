import { beforeEach, describe, expect, it, vi } from 'vitest'
import { member, room } from '../test-fixtures'

const roomServiceMock = vi.hoisted(() => ({ getRoomByCode: vi.fn() }))
const authMock = vi.hoisted(() => ({ requireMembership: vi.fn() }))
const playbackMock = vi.hoisted(() => ({ getState: vi.fn() }))
const membersMock = vi.hoisted(() => ({ getActiveMembers: vi.fn() }))

vi.mock('../services/room.service', () => ({ roomService: roomServiceMock }))
vi.mock('../services/roomAuth.service', () => ({ roomAuthorizationService: authMock }))
vi.mock('../services/playback.service', () => ({ playbackService: playbackMock }))
vi.mock('../services/roomMember.service', () => ({ roomMemberService: membersMock }))

import { RoomSocketHandler } from './RoomSocketHandler'

function fakeSocket() {
  const handlers = new Map<string, (...args: any[]) => void>()
  const socket = {
    data: { user: { userId: member().userId, username: 'viewer' }, joinedRooms: new Map<string, string>() },
    on: vi.fn((event: string, handler: (...args: any[]) => void) => handlers.set(event, handler)),
    emit: vi.fn(),
    join: vi.fn(async (id: string) => socket.data.joinedRooms.set(id, room().roomCode)),
    leave: vi.fn(async (id: string) => socket.data.joinedRooms.delete(id)),
    to: vi.fn(() => ({ emit: vi.fn() })),
    handlers,
  }
  return socket
}

describe('RoomSocketHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    roomServiceMock.getRoomByCode.mockResolvedValue(room())
    authMock.requireMembership.mockResolvedValue(member())
    playbackMock.getState.mockReturnValue({ roomId: room().id, roomCode: room().roomCode, videoId: 'dQw4w9WgXcQ', isPlaying: false, currentTime: 0, stateUpdatedAt: new Date().toISOString() })
    membersMock.getActiveMembers.mockResolvedValue([])
  })

  it('authenticates membership, joins, and synchronizes state', async () => {
    const socket = fakeSocket()
    new RoomSocketHandler().register(socket as never)
    const ack = vi.fn()
    socket.handlers.get('join_room')?.({ roomCode: room().roomCode }, ack)
    await vi.waitFor(() => expect(ack).toHaveBeenCalledWith({ ok: true }))

    expect(socket.join).toHaveBeenCalledWith(room().id)
    expect(socket.emit).toHaveBeenCalledWith('sync_state', expect.objectContaining({ roomId: room().id }))
    expect(socket.emit).toHaveBeenCalledWith('members_updated', expect.any(Object))
  })

  it('rejects a non-member and does not join the room', async () => {
    const socket = fakeSocket()
    authMock.requireMembership.mockRejectedValue(new Error('not a member'))
    new RoomSocketHandler().register(socket as never)
    const ack = vi.fn()
    socket.handlers.get('join_room')?.({ roomCode: room().roomCode }, ack)
    await vi.waitFor(() => expect(ack).toHaveBeenCalledWith({ ok: false, error: 'not a member' }))
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('leaves a room and invokes the leave broadcast only for that room', async () => {
    const socket = fakeSocket()
    socket.data.joinedRooms.set(room().id, room().roomCode)
    new RoomSocketHandler().register(socket as never)
    const ack = vi.fn()
    socket.handlers.get('leave_room')?.({ roomCode: room().roomCode }, ack)
    await vi.waitFor(() => expect(ack).toHaveBeenCalledWith({ ok: true }))
    expect(socket.leave).toHaveBeenCalledWith(room().id)
    expect(socket.to).toHaveBeenCalledWith(room().id)
  })
})
