import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { env } from '../config/env'
import { ChatHandler } from './ChatHandler'
import { PlaybackHandler } from './PlaybackHandler'
import { ReactionHandler } from './ReactionHandler'
import { RequestHandler } from './RequestHandler'
import { RoleHandler } from './RoleHandler'
import { RoomSocketHandler } from './RoomSocketHandler'
import { SocketAuthentication } from './SocketAuthentication'
import { createAdapter } from '@socket.io/redis-adapter'
import { RedisConnection } from '../lib/redis'
import type { AuthenticatedSocket, ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './types'

interface SocketHandler {
  register(socket: AuthenticatedSocket): void
}

export class SocketServer {
  private readonly io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >

  private readonly handlers: SocketHandler[]
  private readonly redisConnection: RedisConnection

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.CLIENT_URL,
        credentials: true,
      },
    })
    this.redisConnection = new RedisConnection()

    this.handlers = [
      new RoomSocketHandler(),
      new PlaybackHandler(this.io),
      new RoleHandler(this.io),
      new ChatHandler(this.io),
      new ReactionHandler(this.io),
      new RequestHandler(this.io),
    ]

    new SocketAuthentication(this.io).register()
    this.io.on('connection', (socket) => {
      for (const handler of this.handlers) {
        handler.register(socket)
      }
    })
  }

  async initialize(): Promise<void> {
    const clients = await this.redisConnection.connect()
    const redisClients = this.redisConnection.getClients()
    if (clients && redisClients) {
      this.io.adapter(createAdapter(redisClients.publisher, redisClients.subscriber))
    }
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve())
    })
    await this.redisConnection.close()
  }
}
