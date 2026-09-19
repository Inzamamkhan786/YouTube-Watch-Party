import type { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/response'
import { logger } from '../utils/logger'
import { isDev } from '../config/env'

/**
 * Operational (expected) application error.
 * Throw this in controllers/services to surface a specific HTTP status.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public override readonly message: string,
    public readonly isOperational = true
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Global error handler middleware — MUST be registered last in app.ts.
 * Express identifies it as an error handler via the 4-argument signature.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const errorWithCode = err as Error & { code?: string; status?: number; type?: string }

  if (errorWithCode.type === 'entity.too.large' || errorWithCode.status === 413) {
    sendError(res, 'Request payload is too large', 413)
    return
  }

  if (err instanceof SyntaxError && errorWithCode.status === 400) {
    sendError(res, 'Malformed JSON request body', 400)
    return
  }

  if (errorWithCode.code === 'EBADCSRFTOKEN') {
    sendError(res, 'Invalid request security token', 403)
    return
  }

  if (errorWithCode.status && errorWithCode.status >= 400 && errorWithCode.status < 500) {
    sendError(res, 'Request rejected', errorWithCode.status)
    return
  }

  // Known operational errors — send the exact message to the client
  if (err instanceof AppError) {
    logger.warn(`[AppError] ${err.statusCode} – ${err.message}`)
    sendError(res, err.message, err.statusCode)
    return
  }

  // Unexpected programming errors — hide internals in production
  logger.error('Unhandled error', {
    name: err.name,
    message: err.message,
    stack: isDev ? err.stack : '[hidden in production]',
    url: req.originalUrl,
    method: req.method,
  })

  sendError(
    res,
    isDev ? err.message : 'Internal server error',
    500
  )
}
