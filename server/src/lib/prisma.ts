import { PrismaClient } from '@prisma/client'
import { isDev } from '../config/env'
import { logger } from '../utils/logger'

/**
 * Global declaration to preserve PrismaClient instance across hot-reloads in development.
 */
declare global {
  // eslint-disable-next-line no-var
  var __globalPrisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  globalThis.__globalPrisma ??
  new PrismaClient({
    log: isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ]
      : [{ emit: 'stdout', level: 'error' }],
  })

if (isDev) {
  globalThis.__globalPrisma = prisma

  // Optional query event logging in dev mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(prisma as any).$on?.('query', (e: { query: string; duration: number }) => {
    logger.debug(`[Prisma Query] (${e.duration}ms) ${e.query}`)
  })
}

/**
 * Connect to the database and verify connectivity.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect()
    logger.info('Connected to PostgreSQL database successfully')
  } catch (err) {
    logger.error('Failed to connect to PostgreSQL database', err)
    throw err
  }
}

/**
 * Disconnect from the database cleanly.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    logger.info('Disconnected from PostgreSQL database')
  } catch (err) {
    logger.error('Error disconnecting from PostgreSQL database', err)
  }
}

// Graceful shutdown hooks
process.on('beforeExit', async () => {
  await disconnectDatabase()
})
