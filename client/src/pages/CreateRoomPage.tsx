import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createRoomApi } from '../services/room'
import { ROUTES } from '../utils/constants'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

import { extractYouTubeVideoId } from '../utils/youtube'

export default function CreateRoomPage() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoInput, setVideoInput] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim() || title.trim().length < 2) {
      setError('Please provide a room title of at least 2 characters.')
      return
    }

    if (isPrivate && (!passcode.trim() || passcode.trim().length < 4)) {
      setError('Private rooms require a passcode with at least 4 characters.')
      return
    }

    let initialVideoId: string | undefined
    if (videoInput.trim()) {
      const parsedId = extractYouTubeVideoId(videoInput)
      if (!parsedId) {
        setError('Please enter a valid YouTube video URL or 11-character video ID.')
        return
      }
      initialVideoId = parsedId
    }

    try {
      setLoading(true)
      const room = await createRoomApi({
        title: title.trim(),
        description: description.trim() || undefined,
        isPrivate,
        passcode: isPrivate ? passcode.trim() : undefined,
        initialVideoId,
      })

      navigate(ROUTES.ROOM.replace(':roomCode', room.roomCode))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create room. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-12">
      <div className="card card-body max-w-lg w-full space-y-6">
        {/* Header */}
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-black)' }}
          >
            Create a SyncTube Room
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--color-black)', opacity: 0.6 }}
          >
            You will become the room <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>HOST</span> with playback authority.
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
            id="room-title"
            label="Room Title"
            placeholder="e.g. Movie Night with Friends"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <Input
            id="room-description"
            label="Description (Optional)"
            placeholder="What are we watching tonight?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            id="room-video"
            label="YouTube Video Link or ID (Optional)"
            placeholder="https://www.youtube.com/watch?v=... or dQw4w9WgXcQ"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            hint="You can also add or change the video anytime inside the room."
          />

          {/* Privacy Toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span className="text-sm font-medium" style={{ color: 'var(--color-black)' }}>
                Require passcode to join (Private Room)
              </span>
            </label>
          </div>

          {isPrivate && (
            <Input
              id="room-passcode"
              type="password"
              label="Room Passcode"
              placeholder="e.g. 1234"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              hint="Participants must enter this passcode to join."
              required
            />
          )}

          <div className="pt-3 flex gap-3">
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
              id="create-room-submit-btn"
            >
              Create Room
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
