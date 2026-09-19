import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { env } from '../config/env'
import { signToken } from '../utils/jwt'
import { AppError } from '../middleware/errorHandler'

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

export class AuthService {
  /**
   * Registers a new user.
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email?.trim().toLowerCase()
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

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existingEmail) {
      throw new AppError(409, 'An account with this email already exists')
    }

    // Check username uniqueness
    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })
    if (existingUsername) {
      throw new AppError(409, 'Username is already taken')
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        email,
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

    const token = signToken({ userId: user.id })

    return { user, token }
  }

  /**
   * Authenticates an existing user.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const email = input.email?.trim().toLowerCase()
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
