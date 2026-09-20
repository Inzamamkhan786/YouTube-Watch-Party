import { useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { healthCheck } from '../services/api'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../utils/constants'
import Button from '../components/ui/Button'
import InteractiveParticleText from '../components/InteractiveParticleText'

export default function HomePage() {
  const { data: health, loading, error, execute } = useApi(healthCheck)
  const { user, isAuthenticated } = useAuth()

  const check = useCallback(() => {
    void execute()
  }, [execute])

  useEffect(() => {
    check()
  }, [check])

  const isOnline = Boolean(health)
  const isOffline = !loading && Boolean(error)

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-3 py-8 sm:px-4 sm:py-12">
      <div className="card card-body max-w-md w-full text-center space-y-6">
        {/* Wordmark */}
        <div className="space-y-2 sm:space-y-3">
          <div className="mx-auto w-full max-w-[17rem] sm:max-w-[20rem] md:max-w-[23rem]">
            <InteractiveParticleText
              key={isAuthenticated ? 'authenticated-home' : 'guest-home'}
              text="SyncTube"
              className="h-14 w-full sm:h-16 md:h-20"
            />
          </div>
          <p
            className="text-xs sm:text-sm"
            style={{ color: 'var(--color-black)', opacity: 0.55 }}
          >
            Watch YouTube videos together, perfectly in sync.
          </p>
        </div>

        {/* Server status */}
        <div
          className="flex items-center justify-center gap-2 text-xs py-2 px-3 rounded-md"
          style={{ backgroundColor: 'var(--color-muted)', opacity: loading ? 0.7 : 1 }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: loading
                ? 'var(--color-muted-dark)'
                : isOnline
                ? 'var(--color-blue)'
                : 'var(--color-primary)',
            }}
          />
          <span style={{ color: 'var(--color-black)', opacity: 0.7 }}>
            {loading
              ? 'Connecting to server…'
              : isOnline
              ? `Server online · uptime ${health?.uptime ?? 0}s`
              : `Server offline — ${error}`}
          </span>
        </div>

        {/* Action buttons */}
        {isAuthenticated && user ? (
          <div className="space-y-4 pt-1">
            <p className="text-sm font-medium" style={{ color: 'var(--color-black)' }}>
              Welcome back,{' '}
              <span style={{ color: 'var(--color-primary)' }}>
                {user.displayName ?? user.username}
              </span>
              !
            </p>
            <div className="flex flex-col gap-2">
              <Link to={ROUTES.ROOMS_CREATE} className="w-full">
                <Button variant="primary" className="w-full" id="home-create-room-btn">
                  + Create a SyncTube Room
                </Button>
              </Link>
              <Link to={ROUTES.ROOMS_JOIN} className="w-full">
                <Button variant="secondary" className="w-full" id="home-join-room-btn">
                  Join with Code or Link
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            <Link to={ROUTES.LOGIN} className="w-full">
              <Button variant="primary" className="h-12 w-full text-base" id="home-signin-btn">
                Sign In
              </Button>
            </Link>
            <Link to={ROUTES.REGISTER} className="w-full">
              <Button variant="secondary" className="h-11 w-full text-base" id="home-register-btn">
                Create Account
              </Button>
            </Link>
          </div>
        )}

        {isOffline && (
          <button
            onClick={check}
            className="text-xs underline"
            style={{ color: 'var(--color-blue)' }}
          >
            Retry connection
          </button>
        )}
      </div>
    </div>
  )
}
