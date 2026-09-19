import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * HTTP request logger middleware.
 * Logs method, path, status code, and duration after response finishes.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now()

  res.on('finish', () => {
    const ms      = Date.now() - start
    const status  = res.statusCode
    const level   = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

    logger[level](`${req.method} ${req.originalUrl} → ${status} (${ms}ms)`)
  })

  next()
}
