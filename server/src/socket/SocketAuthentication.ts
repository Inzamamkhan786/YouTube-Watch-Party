import type { Server } from 'socket.io'
import { prisma } from '../lib/prisma'
import { verifyToken } from '../utils/jwt'
import type { AuthenticatedSocket, SocketUser } from './types'

export class SocketAuthentication {
  constructor(private readonly io: Server) {}

  register(): void {
    this.io.use(async (socket, next) => {
      await this.authenticate(socket as AuthenticatedSocket, next)
    })
  }

  private async authenticate(
    socket: AuthenticatedSocket,
    next: (error?: Error) => void
  ): Promise<void> {
    try {
      const token = this.readToken(socket)
      if (!token) {
        next(new Error('Authentication token missing'))
        return
      }

      const payload = verifyToken(token)
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
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
        next(new Error('User not found or account is inactive'))
        return
      }

      const authenticatedUser: SocketUser = {
        userId: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        authenticatedAt: new Date().toISOString(),
      }

      socket.data.user = authenticatedUser
      socket.data.joinedRooms = new Map()
      next()
    } catch {
      next(new Error('Invalid or expired authentication token'))
    }
  }

  private readToken(socket: AuthenticatedSocket): string | null {
    const authToken = socket.handshake.auth?.token
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim()
    }

    const authorization = socket.handshake.headers.authorization
    if (authorization?.startsWith('Bearer ')) {
      return authorization.substring(7).trim()
    }

    return null
  }
}
