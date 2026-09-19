import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { loginApi, registerApi, getMeApi } from '../services/auth'
import type {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  )
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Clear error helper
  const clearError = useCallback(() => setError(null), [])

  // Hydrate user profile on initial load if token exists
  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      if (!storedToken) {
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const currentUser = await getMeApi()
        if (isMounted) {
          setUser(currentUser)
          setToken(storedToken)
        }
      } catch (err) {
        // Token invalid or expired — clear storage
        localStorage.removeItem(TOKEN_KEY)
        if (isMounted) {
          setUser(null)
          setToken(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  // Login handler
  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true)
    setError(null)
    try {
      const result = await loginApi(credentials)
      localStorage.setItem(TOKEN_KEY, result.token)
      setToken(result.token)
      setUser(result.user)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials.'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Register handler
  const register = useCallback(async (credentials: RegisterCredentials) => {
    setLoading(true)
    setError(null)
    try {
      const result = await registerApi(credentials)
      localStorage.setItem(TOKEN_KEY, result.token)
      setToken(result.token)
      setUser(result.user)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please check your details.'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    loading,
    error,
    login,
    register,
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return context
}
