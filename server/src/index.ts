import http from 'http'
import { app } from './app'
import { env } from './config/env'
import { logger } from './utils/logger'
import { connectDatabase, disconnectDatabase } from './lib/prisma'
import { SocketServer } from './socket/SocketServer'

const server = http.createServer(app)
const socketServer = new SocketServer(server)

async function startServer(): Promise<void> {
  try {
    await socketServer.initialize()

    // Attempt database connection (logs warning in dev if Postgres isn't running yet)
    try {
      await connectDatabase()
    } catch (dbErr) {
      logger.warn('[Database] Could not connect to PostgreSQL on startup. Server will still run in limited mode.', dbErr)
    }

    server.listen(env.PORT, () => {
      logger.info(`Server listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`)
      logger.info(`CORS allowed client: ${env.CLIENT_URL}`)
    })
  } catch (err) {
    logger.error('Failed to start server', err)
    process.exit(1)
  }
}

// Graceful shutdown handling
function shutdown(signal: string): void {
  logger.info(`Received ${signal}. Shutting down gracefully...`)
  server.close(async () => {
    await socketServer.close()
    await disconnectDatabase()
    logger.info('Server closed')
    process.exit(0)
  })

  // Force close after 10s if hung
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 10_000)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

void startServer()
