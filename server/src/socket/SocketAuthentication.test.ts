import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }))
const verifyTokenMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('../utils/jwt', () => ({ verifyToken: verifyTokenMock }))

import { SocketAuthentication } from './SocketAuthentication'

describe('SocketAuthentication', () => {
  beforeEach(() => vi.resetAllMocks())

  it('authenticates every connection/reconnection and refreshes socket session data', async () => {
    const middleware: ((socket: any, next: (error?: Error) => void) => Promise<void>)[] = []
    const io = { use: vi.fn((handler) => middleware.push(handler)) }
    verifyTokenMock.mockReturnValue({ userId: '11111111-1111-4111-8111-111111111111' })
    prismaMock.user.findUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'viewer@example.com', username: 'viewer', displayName: 'Viewer', avatarUrl: null, isActive: true,
    })
    new SocketAuthentication(io as never).register()
    const socket: any = { handshake: { auth: { token: 'jwt' }, headers: {} }, data: { joinedRooms: new Map([['old', 'ABC234']]) } }
    const firstNext = vi.fn()
    await middleware[0](socket, firstNext)
    const secondNext = vi.fn()
    await middleware[0](socket, secondNext)

    expect(firstNext).toHaveBeenCalledWith()
    expect(secondNext).toHaveBeenCalledWith()
    expect(verifyTokenMock).toHaveBeenCalledTimes(2)
    expect(socket.data.joinedRooms).toEqual(new Map())
    expect(socket.data.user.userId).toBe('11111111-1111-4111-8111-111111111111')
    expect(socket.data.user.authenticatedAt).toEqual(expect.any(String))
  })

  it('rejects invalid socket tokens', async () => {
    const middleware: any[] = []
    const io = { use: vi.fn((handler) => middleware.push(handler)) }
    verifyTokenMock.mockImplementation(() => { throw new Error('expired') })
    new SocketAuthentication(io as never).register()
    const next = vi.fn()
    await middleware[0]({ handshake: { auth: { token: 'expired' }, headers: {} }, data: {} }, next)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})
