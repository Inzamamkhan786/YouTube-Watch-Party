import type { Response } from 'express'

/**
 * Standardized API response envelope.
 * Must stay in sync with client/src/types/api.ts
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp: string
}

/** 200 – OK */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): void {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  }
  res.status(statusCode).json(body)
}

/** 201 – Created */
export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, message, 201)
}

/** 4xx / 5xx – Error */
export function sendError(
  res: Response,
  error: string,
  statusCode = 500,
  message?: string
): void {
  const body: ApiResponse = {
    success: false,
    error,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  }
  res.status(statusCode).json(body)
}
