import { beforeEach, describe, expect, it, vi } from 'vitest'
import { room } from '../test-fixtures'

const prismaMock = vi.hoisted(() => ({
  room: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))

import { RoomService } from './room.service'

describe('RoomService', () => {
  const service = new RoomService()

  beforeEach(() => vi.resetAllMocks())

  it('creates a room with the authenticated creator as host', async () => {
    const created = {
      ...room(),
      host: { id: room().hostId, username: 'host', displayName: 'Host', avatarUrl: null },
      _count: { members: 1 },
    }
    prismaMock.room.findUnique.mockResolvedValue(null)
    prismaMock.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        room: {
          create: vi.fn().mockResolvedValue(created),
        },
        roomMember: {
          create: vi.fn().mockResolvedValue(undefined),
        },
      })
    )

    const result = await service.createRoom(room().hostId, { title: ' Movie Night ' })

    expect(result.roomCode).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
    expect(result.currentUserMembership?.role).toBe('HOST')
  })

  it('creates a room with an initial YouTube video ID', async () => {
    const created = {
      ...room(),
      currentVideoId: 'dQw4w9WgXcQ',
      host: { id: room().hostId, username: 'host', displayName: 'Host', avatarUrl: null },
      _count: { members: 1 },
    }
    prismaMock.room.findUnique.mockResolvedValue(null)
    let passedData: any = null
    prismaMock.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        room: {
          create: vi.fn().mockImplementation((args: any) => {
            passedData = args.data
            return Promise.resolve(created)
          }),
        },
        roomMember: {
          create: vi.fn().mockResolvedValue(undefined),
        },
      })
    )

    const result = await service.createRoom(room().hostId, {
      title: 'SyncTube Room',
      initialVideoId: 'dQw4w9WgXcQ',
    })

    expect(passedData?.currentVideoId).toBe('dQw4w9WgXcQ')
    expect(result.currentVideoId).toBe('dQw4w9WgXcQ')
  })

  it.each([
    { title: '' },
    { title: 'x' },
    { title: 'valid', initialVideoId: 'not-a-youtube-id' },
  ])('rejects invalid room input %#', async (input) => {
    await expect(service.createRoom(room().hostId, input)).rejects.toMatchObject({ statusCode: 400 })
  })
})
