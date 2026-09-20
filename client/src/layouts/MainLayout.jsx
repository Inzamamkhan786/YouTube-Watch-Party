import { Outlet, Link, useNavigate } from 'react-router-dom'
import { APP_NAME, ROUTES } from '../utils/constants'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

/**
 * Main shell layout — wraps all authenticated/public pages.
 */
export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate(ROUTES.HOME)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-white)' }}
    >
      {/* ── Top Navigation ── */}
      <header
        className="sticky top-0 z-50 flex min-h-14 flex-col gap-3 border-b px-3 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-6"
        style={{
          borderColor: 'var(--color-muted)',
          backgroundColor: 'var(--color-white)',
        }}
      >
        <Link
          to="/"
          className="font-semibold text-sm hover:no-underline sm:text-base"
          style={{ color: 'var(--color-black)' }}
        >
          Watch
          <span style={{ color: 'var(--color-primary)' }}>
            {APP_NAME.replace('Watch', '')}
          </span>
        </Link>

        {/* Auth status and navigation */}
        <nav
          className="ml-0 flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto"
          aria-label="Main navigation"
        >
          {isAuthenticated && user ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-3">
              <Link to={ROUTES.ROOMS_JOIN}>
                <Button variant="ghost" size="sm" id="nav-join-room-btn">
                  Join Room
                </Button>
              </Link>
              <Link to={ROUTES.ROOMS_CREATE}>
                <Button variant="secondary" size="sm" id="nav-create-room-btn">
                  + Create Room
                </Button>
              </Link>
              <div
                className="mx-1 hidden h-4 w-px sm:block"
                style={{ backgroundColor: 'var(--color-muted)' }}
              />
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--color-primary-soft)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </span>
                <span
                  className="hidden max-w-32 truncate text-xs font-medium md:inline"
                  style={{ color: 'var(--color-black)' }}
                >
                  {user.displayName ?? user.username}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                id="nav-logout-btn"
              >
                Log Out
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <Link to={ROUTES.LOGIN}>
                <Button variant="ghost" size="sm" id="nav-login-btn">
                  Sign In
                </Button>
              </Link>
              <Link to={ROUTES.REGISTER}>
                <Button variant="primary" size="sm" id="nav-register-btn">
                  Create Account
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
