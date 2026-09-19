import { useEffect, useState } from 'react'
import Button from './ui/Button'

interface PlaybackControlsProps {
  canControl: boolean
  ready: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onSeek: (seconds: number) => void
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export default function PlaybackControls({
  canControl,
  ready,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
}: PlaybackControlsProps) {
  const [draftTime, setDraftTime] = useState(currentTime)
  const disabled = !canControl || !ready
  const max = Math.max(duration, currentTime, 1)

  useEffect(() => {
    setDraftTime(currentTime)
  }, [currentTime])

  function commitSeek() {
    onSeek(draftTime)
  }

  return (
    <div className="space-y-3 border-t px-4 py-4" style={{ borderColor: 'var(--color-muted)' }}>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={disabled}
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <span className="text-xs tabular-nums" style={{ color: 'var(--color-black)', opacity: 0.65 }}>
          {formatTime(draftTime)} / {formatTime(duration)}
        </span>
        {!canControl && (
          <span className="ml-auto text-xs" style={{ color: 'var(--color-black)', opacity: 0.55 }}>
            Host or moderator controls playback
          </span>
        )}
      </div>
      <input
        aria-label="Seek video"
        type="range"
        min={0}
        max={max}
        step={0.25}
        value={Math.min(draftTime, max)}
        disabled={disabled}
        onChange={(event) => setDraftTime(Number(event.target.value))}
        onPointerUp={commitSeek}
        onKeyUp={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') commitSeek()
        }}
        className="w-full accent-red-600"
      />
    </div>
  )
}
