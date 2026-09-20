import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../utils/constants'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const { login, error: authError, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Redirect to previously requested page or home
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.HOME

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    clearError()

    if (!email.trim() || !password) {
      setFormError('Please fill in all fields.')
      return
    }

    try {
      setSubmitting(true)
      await login({ email: email.trim(), password })
      navigate(from, { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid credentials. Please try again.'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = formError ?? authError

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-12">
      <div className="card card-body max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-black)' }}
          >
            Welcome Back
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--color-black)', opacity: 0.6 }}
          >
            Sign in to your SyncTube account
          </p>
        </div>

        {/* Error Alert */}
        {displayError && (
          <div
            className="p-3 text-xs rounded-md border"
            style={{
              borderColor: 'var(--color-primary-soft)',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
            }}
            role="alert"
          >
            {displayError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="login-email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />

          <Input
            id="login-password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="w-full"
              id="login-submit-btn"
            >
              Sign In
            </Button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs pt-2">
          <span style={{ color: 'var(--color-black)', opacity: 0.6 }}>
            Don't have an account?{' '}
          </span>
          <Link
            to={ROUTES.REGISTER}
            className="font-medium hover:underline"
            style={{ color: 'var(--color-blue)' }}
          >
            Create one now
          </Link>
        </div>
      </div>
    </div>
  )
}
