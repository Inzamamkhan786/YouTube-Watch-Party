import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomRole } from '@prisma/client'
import { member, room } from '../test-fixtures'

const authMock = vi.hoisted(() => ({ requireRole: vi.fn() }))
const playbackMock = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock('../services/roomAuth.service', () => ({ roomAuthorizationService: authMock }))
vi.mock('../services/playback.service', () => ({ playbackService: playbackMock }))

import { PlaybackHandler } from './PlaybackHandler'

function socket(role: RoomRole) {
  const handlers = new Map<string, (...args: any[]) => void>()
  return {
    data: { user: { userId: member().userId, username: 'viewer' }, joinedRooms: new Map([[room().id, room().roomCode]]) },
    on: vi.fn((event: string, handler: (...args: any[]) => void) => handlers.set(event, handler)),
    emit: vi.fn(),
    handlers,
    role,
  }
}

describe('PlaybackHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.requireRole.mockImplementation(async () => member({ role: RoomRole.HOST }))
    playbackMock.update.mockResolvedValue({ roomId: room().id, roomCode: room().roomCode, videoId: 'dQw4w9WgXcQ', isPlaying: true, currentTime: 5, stateUpdatedAt: new Date().toISOString() })
  })

  it('authorizes host/moderator playback and broadcasts authoritative state', async () => {
    const client = socket(RoomRole.HOST)
    const emitted: unknown[] = []
    const io = { to: vi.fn(() => ({ emit: vi.fn((_event: string, state: unknown) => emitted.push(state)) })) }
    new PlaybackHandler(io as never).register(client as never)
    const ack = vi.fn()
    client.handlers.get('play')?.({ roomCode: room().roomCode, currentTime: 5 }, ack)
    await vi.waitFor(() => expect(ack).toHaveBeenCalledWith({ ok: true }))
    expect(authMock.requireRole).toHaveBeenCalledWith(room().id, member().userId, [RoomRole.HOST, RoomRole.MODERATOR])
    expect(emitted).toHaveLength(1)
  })

  it('rejects participant playback before updating the room', async () => {
    const client = socket(RoomRole.PARTICIPANT)
    authMock.requireRole.mockRejectedValue(new Error('Forbidden'))
    const io = { to: vi.fn() }
    new PlaybackHandler(io as never).register(client as never)
    const ack = vi.fn()
    client.handlers.get('seek')?.({ roomCode: room().roomCode, currentTime: 10 }, ack)
    await vi.waitFor(() => expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Forbidden' }))
    expect(playbackMock.update).not.toHaveBeenCalled()
  })
})
