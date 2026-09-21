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

export async function verifyEmailApi(token) {
  const { data } = await apiClient.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
  if (!data.data) {
    throw new Error(data.error ?? 'Email verification failed')
  }
  return data.data
}

export async function resendVerificationApi(payload) {
  const { data } = await apiClient.post('/api/auth/resend-verification', payload)
  if (!data.data) {
    throw new Error(data.error ?? 'Unable to resend verification email')
  }
  return data.data
}

export async function forgotPasswordApi(payload) {
  const { data } = await apiClient.post('/api/auth/forgot-password', payload)
  if (!data.data) {
    throw new Error(data.error ?? 'Unable to process password reset request')
  }
  return data.data
}

export async function resetPasswordApi(payload) {
  const { data } = await apiClient.post('/api/auth/reset-password', payload)
  if (!data.data) {
    throw new Error(data.error ?? 'Password reset failed')
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
