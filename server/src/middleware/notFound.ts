import type { Request, Response } from 'express'
import { sendError } from '../utils/response'

/**
 * Catch-all 404 handler.
 * Registered after all route definitions to catch unmatched paths.
 */
export function notFound(req: Request, res: Response): void {
  sendError(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404
  )
}
