import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../utils/constants'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children?: ReactNode
}

/**
 * Route guard that requires the user to be authenticated.
 * Preserves the attempted location for redirect after successful login.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div
          className="inline-block w-8 h-8 border-2 border-solid rounded-full animate-spin"
          style={{
            borderColor: 'var(--color-primary)',
            borderRightColor: 'transparent',
          }}
          role="status"
          aria-label="Checking authentication status"
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
