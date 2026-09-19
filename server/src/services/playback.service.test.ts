import { beforeEach, describe, expect, it, vi } from 'vitest'
import { room } from '../test-fixtures'

const prismaMock = vi.hoisted(() => ({
  room: { findUnique: vi.fn(), update: vi.fn() },
}))
vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))

import { PlaybackService } from './playback.service'

describe('PlaybackService', () => {
  const service = new PlaybackService()

  beforeEach(() => vi.resetAllMocks())

  it.each([
    ['play', { type: 'play', currentTime: 12 }],
    ['pause', { type: 'pause', currentTime: 14 }],
    ['seek', { type: 'seek', currentTime: 42 }],
  ] as const)('updates authoritative state for %s', async (_name, action) => {
    const currentRoom = room()
    const updatedRoom = room({ isPlaying: action.type === 'play', currentTime: action.currentTime })
    prismaMock.room.findUnique.mockResolvedValue(currentRoom)
    prismaMock.room.update.mockResolvedValue(updatedRoom)

    const result = await service.update(currentRoom.id, action)

    expect(prismaMock.room.update).toHaveBeenCalled()
    if (action.type === 'play') {
      expect(result.currentTime).toBeGreaterThanOrEqual(action.currentTime)
    } else {
      expect(result.currentTime).toBe(action.currentTime)
    }
    expect(result.isPlaying).toBe(action.type === 'play')
  })

  it('changes video and resets playback', async () => {
    const currentRoom = room()
    const updatedRoom = room({ currentVideoId: '9bZkp7q19f0', currentTime: 0, isPlaying: false })
    prismaMock.room.findUnique.mockResolvedValue(currentRoom)
    prismaMock.room.update.mockResolvedValue(updatedRoom)

    await service.update(currentRoom.id, { type: 'change_video', videoId: '9bZkp7q19f0' })

    expect(prismaMock.room.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ currentVideoId: '9bZkp7q19f0', currentTime: 0, isPlaying: false }),
    }))
  })

  it('calculates elapsed time for a playing room', () => {
    const state = service.getState(room({
      isPlaying: true,
      currentTime: 10,
      stateUpdatedAt: new Date(Date.now() - 5000),
    }))
    expect(state.currentTime).toBeGreaterThanOrEqual(14.9)
  })

  it('rejects playback without a loaded video', async () => {
    const currentRoom = room({ currentVideoId: null })
    prismaMock.room.findUnique.mockResolvedValue(currentRoom)
    await expect(service.update(currentRoom.id, { type: 'play' })).rejects.toMatchObject({ statusCode: 400 })
  })
})
