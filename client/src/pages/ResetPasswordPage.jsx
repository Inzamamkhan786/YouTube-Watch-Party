import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { resetPasswordApi } from '../services/auth'
import { ROUTES } from '../utils/constants'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Missing or invalid reset token.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setSubmitting(true)
      const result = await resetPasswordApi({ token, password })
      navigate(ROUTES.LOGIN, {
        replace: true,
        state: { message: result.message },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-3 py-8 sm:px-4 sm:py-12">
      <div className="card card-body max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-black)' }}>
            Reset Password
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-black)', opacity: 0.6 }}>
            Choose a new password for your account.
          </p>
        </div>

        {error && (
          <div
            className="p-3 text-xs rounded-md border"
            style={{
              borderColor: 'var(--color-primary-soft)',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="reset-password"
            type="password"
            label="New Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            autoFocus
          />

          <Input
            id="reset-confirm-password"
            type="password"
            label="Confirm New Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            Reset Password
          </Button>
        </form>

        <div className="text-center text-xs">
          <Link to={ROUTES.LOGIN} className="font-medium hover:underline" style={{ color: 'var(--color-blue)' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
