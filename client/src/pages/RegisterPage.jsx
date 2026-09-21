import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../utils/constants'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import InteractiveParticleText from '../components/InteractiveParticleText'

export default function RegisterPage() {
  const { register, error: authError, clearError } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    clearError()

    const trimmedUser = username.trim()
    const trimmedEmail = email.trim()

    if (!trimmedUser || !trimmedEmail || !password) {
      setFormError('Please fill in all required fields.')
      return
    }

    if (trimmedUser.length < 3) {
      setFormError('Username must be at least 3 characters long.')
      return
    }

    if (/\s/.test(trimmedUser)) {
      setFormError('Username cannot contain spaces. Use letters, numbers, underscores, or hyphens only.')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUser)) {
      setFormError('Username can only contain letters, numbers, underscores, or hyphens.')
      return
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    try {
      setSubmitting(true)
      const result = await register({
        username: trimmedUser,
        email: trimmedEmail,
        password,
      })
      navigate(ROUTES.LOGIN, {
        replace: true,
        state: {
          message: result?.message,
          from: { pathname: ROUTES.HOME },
        },
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = formError ?? authError

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-3 py-8 sm:px-4 sm:py-12">
      <div className="card card-body max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-full max-w-[16rem] sm:max-w-[19rem] md:max-w-[22rem]">
            <InteractiveParticleText
              text="SyncTube"
              className="h-14 w-full sm:h-16 md:h-18"
            />
          </div>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--color-black)' }}
            >
              Create Account
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--color-black)', opacity: 0.6 }}
            >
              Join SyncTube to start watching together
            </p>
          </div>
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
            id="register-username"
            type="text"
            label="Username"
            placeholder="cool_viewer"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            hint="Letters, numbers, and underscores (min 3 chars)"
            required
            autoComplete="username"
            autoFocus
          />

          <Input
            id="register-email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            id="register-password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="At least 6 characters"
            required
            autoComplete="new-password"
          />

          <Input
            id="register-confirm-password"
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="w-full"
              id="register-submit-btn"
            >
              Create Account
            </Button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs pt-2">
          <span style={{ color: 'var(--color-black)', opacity: 0.6 }}>
            Already have an account?{' '}
          </span>
          <Link
            to={ROUTES.LOGIN}
            className="font-medium hover:underline"
            style={{ color: 'var(--color-blue)' }}
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  )
}
