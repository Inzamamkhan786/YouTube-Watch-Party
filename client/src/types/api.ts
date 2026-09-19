/**
 * Centralized API response shapes.
 * Must stay in sync with server/src/utils/response.ts
 */

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  message?: string
  error?: string
  timestamp: string
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
  message?: string
  statusCode: number
}
