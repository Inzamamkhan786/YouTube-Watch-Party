export interface AuthUser {
  id: string
  email: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  createdAt?: string
}

export interface AuthResult {
  user: AuthUser
  token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
}
