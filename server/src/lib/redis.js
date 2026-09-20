const { createClient } = require('redis')
const { env } = require('../config/env')
const { logger } = require('../utils/logger')

class RedisConnection {
  constructor() {
    this.publisher = null
    this.subscriber = null
    this.connected = false
  }

  async connect() {
    if (!env.REDIS_URL) {
      logger.info('[Redis] REDIS_URL is not configured; using the local Socket.IO adapter')
      return false
    }

    const publisher = createClient({ url: env.REDIS_URL })
    const subscriber = publisher.duplicate()
    const reportError = (error) => {
      logger.warn('[Redis] Redis adapter connection error; Socket.IO will continue locally', error)
    }

    publisher.on('error', reportError)
    subscriber.on('error', reportError)

    try {
      await Promise.all([publisher.connect(), subscriber.connect()])
      this.publisher = publisher
      this.subscriber = subscriber
      this.connected = true
      logger.info('[Redis] Connected; Socket.IO horizontal scaling is enabled')
      return true
    } catch (error) {
      logger.warn('[Redis] Could not connect; falling back to the local Socket.IO adapter', error)
      await Promise.allSettled([
        publisher.quit(),
        subscriber.quit(),
      ])
      return false
    }
  }

  getClients() {
    if (!this.connected || !this.publisher || !this.subscriber) return null
    return { publisher: this.publisher, subscriber: this.subscriber }
  }

  async close() {
    const clients = [this.publisher, this.subscriber].filter(Boolean)
    this.publisher = null
    this.subscriber = null
    this.connected = false
    await Promise.allSettled(clients.map((client) => client.quit()))
    if (clients.length > 0) logger.info('[Redis] Connections closed')
  }
}

module.exports = { RedisConnection }
