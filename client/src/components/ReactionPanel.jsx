import { useEffect, useState } from 'react'
import Button from './ui/Button'

export const ALLOWED_REACTIONS = ['❤️', '👍', '😂', '🔥', '👏', '😮']

function formatVideoTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`
}

export default function ReactionPanel({
  socket,
  roomId,
  videoTime,
  connected,
}) {
  const [floatingReactions, setFloatingReactions] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!socket) return

    const handleReaction = (reaction) => {
      if (reaction.roomId !== roomId) return
      const floating = { ...reaction, expiresAt: Date.now() + 2800 }
      setFloatingReactions((current) => [...current.slice(-7), floating])
      window.setTimeout(() => {
        setFloatingReactions((current) =>
          current.filter((item) => item.id !== reaction.id)
        )
      }, 2800)
    }

    socket.on('new_reaction', handleReaction)
    return () => {
      socket.off('new_reaction', handleReaction)
    }
  }, [roomId, socket])

  function sendReaction(emoji) {
    if (!socket || !connected) return
    setError(null)
    socket.emit('send_reaction', { roomId, emoji, videoTime }, (response) => {
      if (!response.ok) setError(response.error ?? 'Unable to send reaction.')
    })
  }

  return (
    <section className="card relative overflow-hidden" aria-label="Emoji reactions">
      <div className="card-body space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
              Reactions
            </h2>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--color-black)', opacity: 0.55 }}>
              React at {formatVideoTime(videoTime)} in the video
            </p>
          </div>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: connected ? 'var(--color-blue)' : 'var(--color-primary)' }}
            aria-label={connected ? 'Reactions connected' : 'Reactions reconnecting'}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ALLOWED_REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="secondary"
              size="sm"
              disabled={!connected}
              onClick={() => sendReaction(emoji)}
              aria-label={`Send ${emoji} reaction`}
              className="text-lg leading-none"
            >
              {emoji}
            </Button>
          ))}
        </div>

        {error && (
          <p className="text-xs" style={{ color: 'var(--color-primary)' }} role="status">
            {error}
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-20 flex flex-col items-end gap-2" aria-live="polite">
        {floatingReactions.map((reaction, index) => (
          <div
            key={reaction.id}
            className="reaction-float flex items-center gap-2 rounded-full px-3 py-1.5 text-sm shadow-sm"
            style={{
              backgroundColor: 'var(--color-white)',
              color: 'var(--color-black)',
              animationDelay: `${index * 45}ms`,
            }}
          >
            <span className="text-xl" aria-hidden="true">{reaction.emoji}</span>
            <span className="text-[11px] font-medium">
              @{reaction.username} · {formatVideoTime(reaction.videoTime)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
