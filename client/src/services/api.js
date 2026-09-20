import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'

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
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error ?? error.response?.data?.message
    if (message) {
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  }
)

// ── Health ──────────────────────────────────────────────────────
export async function healthCheck() {
  const { data } = await apiClient.get('/api/health')
  return data
}
