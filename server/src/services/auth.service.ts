import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { env } from '../config/env'
import { signToken } from '../utils/jwt'
import { AppError } from '../middleware/errorHandler'
import { emailService } from './email.service'

export interface RegisterInput {
  username: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface UserResponse {
  id: string
  email: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  createdAt: Date
}

export interface AuthResult {
  user: UserResponse
  token: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/
const EMAIL_VERIFICATION_TTL_MS = 30 * 60 * 1000
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function createTokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function createExpiryDate(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs)
}

function buildFrontendUrl(path: string, query?: Record<string, string>): string {
  const url = new URL(path, env.FRONTEND_URL)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

export class AuthService {
  private async createAuthToken(userId: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = createTokenHash(rawToken)
    const expiresAt = createExpiryDate(type === 'EMAIL_VERIFICATION' ? EMAIL_VERIFICATION_TTL_MS : PASSWORD_RESET_TTL_MS)

    await prisma.authToken.deleteMany({
      where: {
        userId,
        type,
      },
    })

    await prisma.authToken.create({
      data: {
        userId,
        tokenHash,
        type,
        expiresAt,
      },
    })

    return rawToken
  }

  private async createVerificationTokens(userId: string): Promise<{ rawToken: string; otp: string }> {
    const rawToken = crypto.randomBytes(32).toString('hex')
    // Generate secure 6-digit numeric OTP code (100000 - 999999)
    const otp = String(crypto.randomInt(100000, 1000000))

    const rawTokenHash = createTokenHash(rawToken)
    const otpHash = createTokenHash(otp)
    const expiresAt = createExpiryDate(EMAIL_VERIFICATION_TTL_MS)

    await prisma.authToken.deleteMany({
      where: {
        userId,
        type: 'EMAIL_VERIFICATION',
      },
    })

    // Store both hashes so either entering the 6-digit OTP or clicking the long token link verifies the account
    await Promise.all([
      prisma.authToken.create({
        data: {
          userId,
          tokenHash: rawTokenHash,
          type: 'EMAIL_VERIFICATION',
          expiresAt,
        },
      }),
      prisma.authToken.create({
        data: {
          userId,
          tokenHash: otpHash,
          type: 'EMAIL_VERIFICATION',
          expiresAt,
        },
      }),
    ])

    return { rawToken, otp }
  }

  /**
   * Registers a new user and triggers an email verification flow.
   */
  async register(input: RegisterInput): Promise<{
    user: UserResponse
    message: string
    emailSent?: boolean
    devOtp?: string
  }> {
    const email = normalizeEmail(input.email ?? '')
    const username = input.username?.trim()
    const password = input.password

    if (!email || !EMAIL_REGEX.test(email)) {
      throw new AppError(400, 'A valid email address is required')
    }

    if (!username || !USERNAME_REGEX.test(username)) {
      throw new AppError(
        400,
        'Username must be between 3 and 30 characters and contain only letters, numbers, hyphens, and underscores'
      )
    }

    if (!password || password.length < 6 || password.length > 128) {
      throw new AppError(400, 'Password must be at least 6 characters long')
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true, username: true },
    })
    if (existingEmail && existingEmail.emailVerified) {
      throw new AppError(409, 'An account with this email already exists')
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true, emailVerified: true, email: true },
    })
    if (existingUsername && existingUsername.emailVerified && existingUsername.email !== email) {
      throw new AppError(409, 'Username is already taken')
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS)

    let user: {
      id: string
      email: string
      username: string
      displayName: string | null
      avatarUrl: string | null
      createdAt: Date
    }

    if (existingEmail && !existingEmail.emailVerified) {
      // Prior attempt had failed verification/email; update unverified account seamlessly
      user = await prisma.user.update({
        where: { id: existingEmail.id },
        data: {
          username,
          passwordHash,
          displayName: username,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          createdAt: true,
        },
      })
    } else {
      user = await prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          displayName: username,
          emailVerified: false,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          createdAt: true,
        },
      })
    }

    const { rawToken, otp } = await this.createVerificationTokens(user.id)

    const emailSent = await emailService.sendVerificationEmail({
      email: user.email,
      username: user.username,
      otp,
      verificationUrl: buildFrontendUrl('/verify-email', { token: rawToken, email: user.email }),
    })

    const message = 'Account created. Please check your email for your 6-digit verification code.'

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      message,
      emailSent,
    }
  }

  /**
   * Authenticates an existing user.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const email = normalizeEmail(input.email ?? '')
    const password = input.password

    if (!email || !password || password.length > 128) {
      throw new AppError(400, 'Email and password are required')
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        passwordHash: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid email or password')
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      throw new AppError(401, 'Invalid email or password')
    }

    if (!user.emailVerified) {
      throw new AppError(403, 'Please verify your email before signing in.')
    }

    const token = signToken({ userId: user.id })

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      token,
    }
  }

  async verifyEmail(input: string | { tokenOrOtp: string; email?: string }): Promise<{ message: string }> {
    const rawInput = typeof input === 'string' ? input : input?.tokenOrOtp
    const trimmedInput = rawInput?.trim() ?? ''
    if (!trimmedInput) {
      throw new AppError(400, 'Invalid or expired verification code')
    }

    const providedEmail =
      typeof input === 'object' && input?.email ? normalizeEmail(input.email) : undefined

    const tokenHash = createTokenHash(trimmedInput)
    const authToken = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: 'EMAIL_VERIFICATION',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            emailVerified: true,
            isActive: true,
          },
        },
      },
    })

    if (!authToken || !authToken.user) {
      throw new AppError(400, 'Invalid or expired verification code')
    }

    if (providedEmail && authToken.user.email !== providedEmail) {
      throw new AppError(400, 'Verification code does not match this email address')
    }

    if (authToken.expiresAt <= new Date()) {
      await prisma.authToken.deleteMany({
        where: { userId: authToken.userId, type: 'EMAIL_VERIFICATION' },
      })
      throw new AppError(400, 'Verification code has expired. Please request a new one.')
    }

    if (authToken.usedAt) {
      await prisma.authToken.deleteMany({
        where: { userId: authToken.userId, type: 'EMAIL_VERIFICATION' },
      })
      throw new AppError(400, 'This verification code has already been used.')
    }

    if (authToken.user.emailVerified) {
      await prisma.authToken.deleteMany({
        where: { userId: authToken.userId, type: 'EMAIL_VERIFICATION' },
      })
      return { message: 'Your email is already verified. You can sign in now.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: authToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      })
      await tx.authToken.deleteMany({
        where: {
          userId: authToken.userId,
          type: 'EMAIL_VERIFICATION',
        },
      })
    })

    return { message: 'Email verified successfully. You can now sign in.' }
  }

  async resendVerification(email: string): Promise<{
    message: string
    emailSent?: boolean
    devOtp?: string
  }> {
    const normalizedEmail = normalizeEmail(email ?? '')
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      throw new AppError(400, 'A valid email address is required')
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
      },
    })

    if (!user || user.emailVerified) {
      return {
        message: 'If an account exists for this email, a new verification code has been sent.',
      }
    }

    const { rawToken, otp } = await this.createVerificationTokens(user.id)
    const emailSent = await emailService.sendVerificationEmail({
      email: user.email,
      username: user.username,
      otp,
      verificationUrl: buildFrontendUrl('/verify-email', { token: rawToken, email: user.email }),
    })

    const message = 'A new verification code has been sent to your email.'

    return {
      message,
      emailSent,
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = normalizeEmail(email ?? '')
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      throw new AppError(400, 'A valid email address is required')
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        username: true,
      },
    })

    if (!user) {
      return {
        message: 'If an account exists for this email, a password reset link has been sent.',
      }
    }

    const resetToken = await this.createAuthToken(user.id, 'PASSWORD_RESET')
    await emailService.sendPasswordResetEmail({
      email: user.email,
      username: user.username,
      resetUrl: buildFrontendUrl('/reset-password', { token: resetToken }),
    })

    return {
      message: 'If an account exists for this email, a password reset link has been sent.',
    }
  }

  async resetPassword(input: { token: string; password: string }): Promise<{ message: string }> {
    const token = input.token?.trim() ?? ''
    const password = input.password

    if (!token || token.length < 20) {
      throw new AppError(400, 'Invalid or expired password reset token')
    }

    if (!password || password.length < 6 || password.length > 128) {
      throw new AppError(400, 'Password must be at least 6 characters long')
    }

    const tokenHash = createTokenHash(token)
    const authToken = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: 'PASSWORD_RESET',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            passwordHash: true,
            username: true,
          },
        },
      },
    })

    if (!authToken || !authToken.user) {
      throw new AppError(400, 'Invalid or expired password reset token')
    }

    if (authToken.expiresAt <= new Date()) {
      await prisma.authToken.delete({ where: { id: authToken.id } })
      throw new AppError(400, 'Password reset link has expired. Please request a new one.')
    }

    if (authToken.usedAt) {
      await prisma.authToken.delete({ where: { id: authToken.id } })
      throw new AppError(400, 'This password reset link has already been used.')
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: authToken.userId },
        data: { passwordHash },
      })
      await tx.authToken.delete({ where: { id: authToken.id } })
    })

    return { message: 'Password reset successfully. You can now sign in.' }
  }

  /**
   * Retrieves the current user profile by user ID.
   */
  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new AppError(404, 'User not found')
    }

    return user
  }
}

export const authService = new AuthService()
