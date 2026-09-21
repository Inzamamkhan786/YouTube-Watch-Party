import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { resendVerificationApi, verifyEmailApi } from '../services/auth'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { ROUTES } from '../utils/constants'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [email, setEmail] = useState(location.state?.email ?? '')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const token = searchParams.get('token')

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (!token) {
      return
    }

    let active = true

    async function verifyToken() {
      setStatus('loading')
      setMessage('')

      try {
        const result = await verifyEmailApi(token)
        if (!active) {
          return
        }
        setStatus('success')
        setMessage(result.message)
      } catch (err) {
        if (!active) {
          return
        }
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Unable to verify your email.')
      }
    }

    void verifyToken()

    return () => {
      active = false
    }
  }, [token])

  async function handleResend() {
    if (!email.trim()) {
      setStatus('error')
      setMessage('Please enter your email address.')
      return
    }

    if (cooldown > 0) {
      setStatus('error')
      setMessage(`Please wait ${cooldown}s before requesting another verification email.`)
      return
    }

    setSubmitting(true)
    setStatus('loading')
    setMessage('')

    try {
      const result = await resendVerificationApi({ email: email.trim() })
      setStatus('success')
      setMessage(result.message)
      setCooldown(45)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Unable to resend verification email.')
    } finally {
      setSubmitting(false)
    }
  }

  const isSuccess = status === 'success'
  const isError = status === 'error'

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-3 py-8 sm:px-4 sm:py-12">
      <div className="card card-body max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-black)' }}>
            {token ? 'Email Verification' : 'Check your email'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-black)', opacity: 0.6 }}>
            {token
              ? 'Please wait while we confirm your email address.'
              : 'We sent a verification link to your inbox.'}
          </p>
          {!token && email && (
            <p className="text-xs" style={{ color: 'var(--color-blue)' }}>
              {email}
            </p>
          )}
        </div>

        {message && (
          <div
            className="p-3 text-xs rounded-md border"
            style={{
              borderColor: isError ? 'var(--color-primary-soft)' : 'rgba(6, 95, 212, 0.25)',
              backgroundColor: isError ? 'var(--color-primary-soft)' : 'rgba(6, 95, 212, 0.08)',
              color: isError ? 'var(--color-primary)' : 'var(--color-blue)',
            }}
            role="alert"
          >
            {message}
          </div>
        )}

        {!token && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault()
            handleResend()
          }}>
            <Input
              id="verify-email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Button type="submit" variant="primary" loading={submitting} disabled={cooldown > 0} className="w-full">
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
            </Button>
          </form>
        )}

        {token && !isSuccess && !isError && (
          <div className="text-center text-sm" style={{ color: 'var(--color-black)', opacity: 0.7 }}>
            Verifying your account…
          </div>
        )}

        <div className="flex flex-col gap-3 text-center text-xs sm:flex-row sm:justify-center">
          <Link to={ROUTES.LOGIN} className="font-medium hover:underline" style={{ color: 'var(--color-blue)' }}>
            Return to login
          </Link>
          {!token && (
            <button
              type="button"
              onClick={() => navigate(ROUTES.REGISTER, { replace: true })}
              className="font-medium hover:underline"
              style={{ color: 'var(--color-blue)' }}
            >
              Change email
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
