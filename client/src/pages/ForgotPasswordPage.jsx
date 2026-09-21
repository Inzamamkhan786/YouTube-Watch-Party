import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { forgotPasswordApi } from '../services/auth'
import { ROUTES } from '../utils/constants'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return
    }

    try {
      setSubmitting(true)
      const result = await forgotPasswordApi({ email: trimmedEmail })
      setSuccess(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process your request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-3 py-8 sm:px-4 sm:py-12">
      <div className="card card-body max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-black)' }}>
            Forgot Password
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-black)', opacity: 0.6 }}>
            Enter your email to receive a reset link.
          </p>
        </div>

        {(error || success) && (
          <div
            className="p-3 text-xs rounded-md border"
            style={{
              borderColor: error ? 'var(--color-primary-soft)' : 'rgba(6, 95, 212, 0.25)',
              backgroundColor: error ? 'var(--color-primary-soft)' : 'rgba(6, 95, 212, 0.08)',
              color: error ? 'var(--color-primary)' : 'var(--color-blue)',
            }}
            role="alert"
          >
            {error || success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="forgot-password-email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            Send Reset Link
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
