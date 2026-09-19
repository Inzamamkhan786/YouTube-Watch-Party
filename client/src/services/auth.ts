import { apiClient } from './api'
import type { ApiResponse } from '../types/api'
import type {
  AuthResult,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth'

/**
 * Logs in a user with email and password.
 */
export async function loginApi(credentials: LoginCredentials): Promise<AuthResult> {
  const { data } = await apiClient.post<ApiResponse<AuthResult>>(
    '/api/auth/login',
    credentials
  )
  if (!data.data) {
    throw new Error(data.error ?? 'Login failed')
  }
  return data.data
}

/**
 * Registers a new user with username, email, and password.
 */
export async function registerApi(
  credentials: RegisterCredentials
): Promise<AuthResult> {
  const { data } = await apiClient.post<ApiResponse<AuthResult>>(
    '/api/auth/register',
    credentials
  )
  if (!data.data) {
    throw new Error(data.error ?? 'Registration failed')
  }
  return data.data
}

/**
 * Fetches the currently authenticated user using stored Bearer token.
 */
export async function getMeApi(): Promise<AuthUser> {
  const { data } = await apiClient.get<ApiResponse<{ user: AuthUser }>>(
    '/api/auth/me'
  )
  if (!data.data?.user) {
    throw new Error(data.error ?? 'Failed to retrieve user')
  }
  return data.data.user
}
