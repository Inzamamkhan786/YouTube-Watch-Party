import axios, { type AxiosError } from 'axios'
import { API_BASE_URL } from '../utils/constants'
import type { ApiResponse } from '../types/api'

/**
 * Shared Axios instance.
 * All API calls should go through this client so interceptors apply uniformly.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor ────────────────────────────────────────
// Attaches JWT from localStorage when available (wired in Module 2)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ────────────────────────────────────────
// Normalizes Axios errors — no silent failures
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    const message = error.response?.data?.error ?? error.response?.data?.message
    if (message) {
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  }
)

// ── Health ──────────────────────────────────────────────────────
export async function healthCheck(): Promise<ApiResponse<{ status: string; uptime: number }>> {
  const { data } = await apiClient.get<ApiResponse<{ status: string; uptime: number }>>('/api/health')
  return data
}
