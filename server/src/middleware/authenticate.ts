import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'
import { sendError } from '../utils/response'
import { logger } from '../utils/logger'

/**
 * Reusable authentication middleware.
 * - Reads `Authorization: Bearer <token>`
 * - Verifies the JWT and extracts `userId`
 * - Verifies user exists in database and is active
 * - Attaches user info to `req.user`
 * - Rejects invalid, expired, or missing tokens with 401 Unauthorized
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authorization token missing or malformed', 401)
    return
  }

  const token = authHeader.substring(7).trim()

  if (!token) {
    sendError(res, 'Authorization token missing', 401)
    return
  }

  try {
    const decoded = verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      sendError(res, 'User not found or account is deactivated', 401)
      return
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    }

    next()
  } catch (err) {
    logger.warn('[Auth] Token verification failed', err)
    sendError(res, 'Invalid or expired authentication token', 401)
  }
}
