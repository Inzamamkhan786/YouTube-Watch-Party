import { useState, type FormEvent } from 'react'
import Button from './ui/Button'
import Input from './ui/Input'

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (VIDEO_ID.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) {
      const id = url.pathname.slice(1).split('/')[0]
      return VIDEO_ID.test(id) ? id : null
    }
    const id = url.searchParams.get('v')
    return id && VIDEO_ID.test(id) ? id : null
  } catch {
    return null
  }
}

interface VideoInputProps {
  disabled?: boolean
  onChangeVideo: (videoId: string) => void
}

export default function VideoInput({ disabled = false, onChangeVideo }: VideoInputProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const videoId = extractYouTubeVideoId(input)
    if (!videoId) {
      setError('Enter a valid YouTube video URL or 11-character video ID.')
      return
    }
    setError(null)
    onChangeVideo(videoId)
    setInput('')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <Input
          id="room-video-input"
          label="YouTube video"
          placeholder="Paste a YouTube link or video ID"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={disabled}
          hint={error ?? 'Only the host or moderator can change the video.'}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={disabled}>
        Load video
      </Button>
    </form>
  )
}
