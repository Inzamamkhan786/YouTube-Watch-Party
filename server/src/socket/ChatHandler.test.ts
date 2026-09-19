import { beforeEach, describe, expect, it, vi } from 'vitest'
import { member, room } from '../test-fixtures'

const prismaMock = vi.hoisted(() => ({
  message: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  reaction: { create: vi.fn() },
}))
const authMock = vi.hoisted(() => ({ requireMembership: vi.fn() }))
vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('../services/roomAuth.service', () => ({ roomAuthorizationService: authMock }))

import { ChatHandler } from './ChatHandler'
import { ReactionHandler } from './ReactionHandler'

function fakeSocket(roomId = room().id) {
  const handlers = new Map<string, (...args: any[]) => void>()
  return {
    data: { user: { userId: member().userId, username: 'viewer' }, joinedRooms: new Map([[roomId, room().roomCode]]) },
    on: vi.fn((event: string, handler: (...args: any[]) => void) => handlers.set(event, handler)),
    emit: vi.fn(),
    handlers,
  }
}

function fakeIo() {
  const emitted: Array<{ roomId: string; event: string; payload: unknown }> = []
  return {
    emitted,
    to: vi.fn((roomId: string) => ({
      emit: vi.fn((event: string, payload: unknown) => emitted.push({ roomId, event, payload })),
    })),
  }
}

describe('ChatHandler and ReactionHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.requireMembership.mockResolvedValue(member())
  })

  it('persists and broadcasts a chat message only to the joined room', async () => {
    const socket = fakeSocket()
    const io = fakeIo()
    prismaMock.message.create.mockResolvedValue({
      id: 'message-1', roomId: room().id, userId: member().userId,
      content: 'hello', createdAt: new Date(),
    })
    new ChatHandler(io as never).register(socket as never)
    const ack = vi.fn()
    socket.handlers.get('send_message')?.({ roomId: room().id, message: ' hello ' }, ack)
    await vi.waitFor(() => expect(ack).toHaveBeenCalledWith({ ok: true }))

    expect(prismaMock.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ roomId: room().id, userId: member().userId, content: 'hello' }),
    }))
    expect(io.emitted).toHaveLength(1)
    expect(io.emitted[0].roomId).toBe(room().id)
  })

  it('rejects chat from a room the socket has not joined', async () => {
    const socket = fakeSocket('44444444-4444-4444-8444-444444444444')
    const io = fakeIo()
    new ChatHandler(io as never).register(socket as never)
    const ack = vi.fn()
    socket.handlers.get('send_message')?.({ roomId: room().id, message: 'intrusion' }, ack)
    await vi.waitFor(() => expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false })))
    expect(prismaMock.message.create).not.toHaveBeenCalled()
    expect(io.emitted).toHaveLength(0)
  })

  it('persists an allowed reaction with the video timestamp and rejects unknown emojis', async () => {
    const socket = fakeSocket()
    const io = fakeIo()
    prismaMock.reaction.create.mockResolvedValue({ id: 'reaction-1', roomId: room().id, userId: member().userId, emoji: '🔥', videoTime: 33, createdAt: new Date() })
    new ReactionHandler(io as never).register(socket as never)
    const ack = vi.fn()
    socket.handlers.get('send_reaction')?.({ roomId: room().id, emoji: '🔥', videoTime: 33 }, ack)
    await vi.waitFor(() => expect(ack).toHaveBeenCalledWith({ ok: true }))
    expect(io.emitted[0]).toMatchObject({ roomId: room().id, event: 'new_reaction', payload: expect.objectContaining({ videoTime: 33 }) })

    const invalidAck = vi.fn()
    socket.handlers.get('send_reaction')?.({ roomId: room().id, emoji: '💣', videoTime: 33 }, invalidAck)
    await vi.waitFor(() => expect(invalidAck).toHaveBeenCalledWith(expect.objectContaining({ ok: false })))
  })
})
