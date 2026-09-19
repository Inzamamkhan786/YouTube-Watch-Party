import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { corsOptions } from './config/cors'
import { apiRateLimiter } from './middleware/rateLimit'
import { requestLogger } from './middleware/requestLogger'
import { notFound } from './middleware/notFound'
import { errorHandler } from './middleware/errorHandler'
import { sendSuccess } from './utils/response'
import authRoutes from './routes/auth.routes'
import roomRoutes from './routes/room.routes'

export function createApp(): Express {
  const app = express()

  // ── Global Middleware ──────────────────────────────────────────
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors(corsOptions))
  app.use(apiRateLimiter)
  app.use(express.json({ limit: '50kb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(requestLogger)

  // ── Health Endpoint ────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    sendSuccess(res, {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
    })
  })

  // ── Module Routes ──────────────────────────────────────────────
  app.use('/api/auth', authRoutes)
  app.use('/api/rooms', roomRoutes)

  // ── Error Handling ─────────────────────────────────────────────
  app.use(notFound)
  app.use(errorHandler)

  return app
}

export const app = createApp()
