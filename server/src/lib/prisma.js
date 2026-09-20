const { PrismaClient } = require('@prisma/client')
const { isDev } = require('../config/env')
const { logger } = require('../utils/logger')

const prisma =
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

  prisma.$on?.('query', (e) => {
    logger.debug(`[Prisma Query] (${e.duration}ms) ${e.query}`)
  })
}

/**
 * Connect to the database and verify connectivity.
 */
async function connectDatabase() {
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
async function disconnectDatabase() {
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

module.exports = { prisma, connectDatabase, disconnectDatabase }
