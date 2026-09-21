import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  authToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(async (cb) => cb({
    user: { update: vi.fn() },
    authToken: { delete: vi.fn(), deleteMany: vi.fn() },
  })),
}))

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))

import { AuthService } from './auth.service'
import { resolveSmtpFromAddress } from './email.service'

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
    expect(result.message).toContain('check your email')
    expect(prismaMock.authToken.create).toHaveBeenCalled()
  })

  it('logs in with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 10)
    prismaMock.user.findUnique.mockResolvedValue({
      ...createdUser,
      emailVerified: true,
      passwordHash,
      isActive: true,
    })

    const result = await service.login({ email: 'USER@example.com', password: 'password123' })

    expect(result.user.email).toBe('user@example.com')
    expect(result.token).toEqual(expect.any(String))
  })

  it('rejects login for unverified users before issuing a session token', async () => {
    const passwordHash = await bcrypt.hash('password123', 10)
    prismaMock.user.findUnique.mockResolvedValue({
      ...createdUser,
      emailVerified: false,
      passwordHash,
      isActive: true,
    })

    await expect(service.login({ email: 'USER@example.com', password: 'password123' }))
      .rejects.toMatchObject({ statusCode: 403, message: 'Please verify your email before signing in.' })
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

  it('allows unverified user to re-register and updates credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createdUser,
      emailVerified: false,
    }).mockResolvedValueOnce(null)
    prismaMock.user.update.mockResolvedValue(createdUser)

    const result = await service.register({
      username: 'viewer',
      email: 'user@example.com',
      password: 'newpassword123',
    })

    expect(prismaMock.user.update).toHaveBeenCalled()
    expect(result.user.email).toBe('user@example.com')
  })

  it('verifies user with valid OTP code', async () => {
    prismaMock.authToken.findFirst.mockResolvedValue({
      id: 'token-123',
      userId: createdUser.id,
      expiresAt: new Date(Date.now() + 60000),
      usedAt: null,
      user: {
        id: createdUser.id,
        email: 'user@example.com',
        username: 'viewer',
        emailVerified: false,
        isActive: true,
      },
    })

    const result = await service.verifyEmail({ tokenOrOtp: '123456', email: 'user@example.com' })
    expect(result.message).toContain('Email verified successfully')
    expect(prismaMock.$transaction).toHaveBeenCalled()
  })

  it('uses the authenticated SMTP user as a safe fallback when the configured sender is missing or invalid', () => {
    const from = resolveSmtpFromAddress('SyncTube', 'haquemdinzamamu@gmail.com')
    expect(from).toBe('SyncTube <haquemdinzamamu@gmail.com>')

    const fromWithoutDisplayName = resolveSmtpFromAddress('', 'haquemdinzamamu@gmail.com')
    expect(fromWithoutDisplayName).toBe('haquemdinzamamu@gmail.com')
  })
})
