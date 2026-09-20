import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { joinRoomApi } from '../services/room'
import { ROUTES } from '../utils/constants'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

/**
 * Extracts a room code from either raw code or full URL.
 */
function extractRoomCode(input) {
  const trimmed = input.trim()
  if (!trimmed) return ''

  // If a full link is pasted (e.g., http://localhost:5173/room/W7X9KP or /room/W7X9KP)
  const match = trimmed.match(/\/room\/([a-zA-Z0-9_-]+)/i)
  if (match?.[1]) {
    return match[1].toUpperCase()
  }

  // Direct code (remove spaces/dashes)
  return trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

export default function JoinRoomPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const prefilledCode = searchParams.get('code') ?? ''
  const [code, setCode] = useState(prefilledCode)
  const [passcode, setPasscode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const cleanCode = extractRoomCode(code)
    if (!cleanCode || cleanCode.length < 3) {
      setError('Please enter a valid room code or room link.')
      return
    }

    try {
      setLoading(true)
      const { room } = await joinRoomApi(cleanCode, passcode.trim() || undefined)
      navigate(ROUTES.ROOM.replace(':roomCode', room.roomCode))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to join room. Please check the code.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-12">
      <div className="card card-body max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-black)' }}
          >
            Join SyncTube
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--color-black)', opacity: 0.6 }}
          >
            Enter the room code or paste the party link to join friends.
          </p>
        </div>

        {/* Error Alert */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="join-code"
            label="Room Code or Link"
            placeholder="e.g. W7X9KP or paste link"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            hint="You can paste the entire party URL or just the 6-character code."
            required
            autoFocus
          />

          <Input
            id="join-passcode"
            type="password"
            label="Passcode (Only if room is private)"
            placeholder="Passcode (optional)"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />

          <div className="pt-2 flex gap-3">
            <Link to={ROUTES.HOME} className="flex-1">
              <Button variant="secondary" type="button" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="flex-1"
              id="join-room-submit-btn"
            >
              Join Room
            </Button>
          </div>
        </form>

        <div className="text-center text-xs pt-2">
          <span style={{ color: 'var(--color-black)', opacity: 0.6 }}>
            Want to host your own SyncTube room?{' '}
          </span>
          <Link
            to={ROUTES.ROOMS_CREATE}
            className="font-medium hover:underline"
            style={{ color: 'var(--color-blue)' }}
          >
            Create a Room
          </Link>
        </div>
      </div>
    </div>
  )
}
