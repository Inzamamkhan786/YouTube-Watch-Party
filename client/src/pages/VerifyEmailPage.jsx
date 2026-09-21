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

  const [email, setEmail] = useState(
    location.state?.email || searchParams.get('email') || ''
  )
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState(() => {
    const raw = location.state?.message || ''
    if (raw.includes('or use verification code:') || raw.includes('Verification code generated:')) {
      return 'Account created. Please check your email for your 6-digit verification code.'
    }
    return raw
  })
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const tokenParam = searchParams.get('token') || searchParams.get('otp')

  // Handle countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  // If URL has token/otp query param, auto-verify immediately
  useEffect(() => {
    if (!tokenParam) return

    let active = true

    async function autoVerify() {
      setStatus('loading')
      setMessage('')
      try {
        const result = await verifyEmailApi({
          token: tokenParam,
          otp: tokenParam,
          email: email.trim() || undefined,
        })
        if (!active) return
        setStatus('success')
        setMessage(result.message || 'Email verified successfully! You can now log in.')
        setTimeout(() => {
          navigate(ROUTES.LOGIN, { replace: true })
        }, 2200)
      } catch (err) {
        if (!active) return
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Unable to verify email.')
      }
    }

    void autoVerify()

    return () => {
      active = false
    }
  }, [tokenParam])

  // Handle manual OTP submission
  async function handleVerifyOtp(e) {
    if (e) e.preventDefault()
    const trimmedOtp = otp.trim()

    if (!trimmedOtp) {
      setStatus('error')
      setMessage('Please enter the 6-digit verification code.')
      return
    }

    if (trimmedOtp.length < 6) {
      setStatus('error')
      setMessage('Verification code must be 6 digits.')
      return
    }

    setSubmitting(true)
    setStatus('loading')
    setMessage('')

    try {
      const result = await verifyEmailApi({
        otp: trimmedOtp,
        token: trimmedOtp,
        email: email.trim() || undefined,
      })
      setStatus('success')
      setMessage(result.message || 'Email verified successfully! Redirecting to login...')
      setTimeout(() => {
        navigate(ROUTES.LOGIN, { replace: true })
      }, 2000)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Verification failed. Please check your code.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle resend verification
  async function handleResend() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setStatus('error')
      setMessage('Please enter your email address to resend the code.')
      return
    }

    if (cooldown > 0) {
      setStatus('error')
      setMessage(`Please wait ${cooldown}s before requesting another code.`)
      return
    }

    setResending(true)
    setMessage('')

    try {
      const result = await resendVerificationApi({ email: trimmedEmail })
      setStatus('idle')
      setMessage(result.message || 'A new verification code has been sent.')
      setCooldown(45)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Unable to resend verification code.')
    } finally {
      setResending(false)
    }
  }

  const isSuccess = status === 'success'
  const isError = status === 'error'

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-3 py-8 sm:px-4 sm:py-12">
      <div className="card card-body max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-50 text-red-600">
            {isSuccess ? (
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-black)' }}>
            {isSuccess ? 'Email Verified!' : 'Email Verification'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-black)', opacity: 0.7 }}>
            {isSuccess
              ? 'Your account is ready. Redirecting to login...'
              : 'Enter the 6-digit verification code sent to your email.'}
          </p>
          {email && !isSuccess && (
            <p className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              {email}
            </p>
          )}
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-3 text-xs rounded-md border text-center ${
              isSuccess
                ? 'border-green-300 bg-green-50 text-green-700'
                : isError
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}

        {/* Verification Form */}
        {!isSuccess && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label
                htmlFor="otp-input"
                className="block text-xs font-medium mb-1.5 text-center"
                style={{ color: 'var(--color-black)' }}
              >
                6-Digit Verification Code
              </label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setOtp(cleaned)
                }}
                placeholder="123456"
                autoFocus
                className="w-full text-center tracking-[0.6em] text-2xl font-mono font-bold py-3 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={otp.trim().length < 6}
              className="w-full"
            >
              Verify Code
            </Button>
          </form>
        )}

        {/* Resend Section */}
        {!isSuccess && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--color-black)', opacity: 0.6 }}>
                Didn't receive the code?
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className="font-medium text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>

            {/* If email was not passed in state, show field to update */}
            {!email && (
              <Input
                id="resend-email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
          </div>
        )}

        {/* Success Action */}
        {isSuccess && (
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => navigate(ROUTES.LOGIN, { replace: true })}
          >
            Go to Sign In
          </Button>
        )}

        {/* Footer Navigation */}
        <div className="flex flex-col gap-2 text-center text-xs sm:flex-row sm:justify-center pt-2">
          <Link
            to={ROUTES.LOGIN}
            className="font-medium hover:underline"
            style={{ color: 'var(--color-blue)' }}
          >
            Back to Sign In
          </Link>
          <span className="hidden sm:inline" style={{ color: 'var(--color-black)', opacity: 0.3 }}>•</span>
          <button
            type="button"
            onClick={() => navigate(ROUTES.REGISTER, { replace: true })}
            className="font-medium hover:underline"
            style={{ color: 'var(--color-blue)' }}
          >
            Change Email / Re-register
          </button>
        </div>
      </div>
    </div>
  )
}
