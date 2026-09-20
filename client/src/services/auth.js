import { apiClient } from './api'

/**
 * Logs in a user with email and password.
 */
export async function loginApi(credentials) {
  const { data } = await apiClient.post('/api/auth/login', credentials)
  if (!data.data) {
    throw new Error(data.error ?? 'Login failed')
  }
  return data.data
}

/**
 * Registers a new user with username, email, and password.
 */
export async function registerApi(credentials) {
  const { data } = await apiClient.post('/api/auth/register', credentials)
  if (!data.data) {
    throw new Error(data.error ?? 'Registration failed')
  }
  return data.data
}

/**
 * Fetches the currently authenticated user using stored Bearer token.
 */
export async function getMeApi() {
  const { data } = await apiClient.get('/api/auth/me')
  if (!data.data?.user) {
    throw new Error(data.error ?? 'Failed to retrieve user')
  }
  return data.data.user
}
