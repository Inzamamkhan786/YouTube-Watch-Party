import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))

import { AuthService } from './auth.service'

const createdUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  username: 'viewer',
  displayName: 'viewer',
  avatarUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('AuthService', () => {
  const service = new AuthService()

  beforeEach(() => vi.resetAllMocks())

  it('registers with normalized identity and a bcrypt password hash', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(createdUser)

    const result = await service.register({
      username: ' viewer ',
      email: ' USER@example.com ',
      password: 'correct horse battery staple',
    })

    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'user@example.com',
        username: 'viewer',
        passwordHash: expect.any(String),
      }),
    }))
    const hash = prismaMock.user.create.mock.calls[0][0].data.passwordHash
    expect(await bcrypt.compare('correct horse battery staple', hash)).toBe(true)
    expect(result.token).toEqual(expect.any(String))
  })

  it('logs in with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 10)
    prismaMock.user.findUnique.mockResolvedValue({
      ...createdUser,
      passwordHash,
      isActive: true,
    })

    const result = await service.login({ email: 'USER@example.com', password: 'password123' })

    expect(result.user.email).toBe('user@example.com')
    expect(result.token).toEqual(expect.any(String))
  })

  it('rejects invalid credentials without revealing which field failed', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    await expect(service.login({ email: 'missing@example.com', password: 'wrong' }))
      .rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' })
  })

  it.each([
    [{ username: 'x', email: 'valid@example.com', password: 'password123' }],
    [{ username: 'valid', email: 'invalid', password: 'password123' }],
    [{ username: 'valid', email: 'valid@example.com', password: 'short' }],
  ])('rejects malformed registration details', async (input) => {
    await expect(service.register(input)).rejects.toMatchObject({ statusCode: 400 })
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })
})
