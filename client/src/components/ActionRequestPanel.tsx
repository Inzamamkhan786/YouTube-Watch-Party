import { useState } from 'react'
import Button from './ui/Button'
import { extractYouTubeVideoId } from '../utils/youtube'
import type { ActionRequest, RequestType } from '../services/socket'
import type { RoomRole } from '../types/room'

interface ActionRequestPanelProps {
  role: RoomRole
  enabled: boolean
  requests: ActionRequest[]
  notices: string[]
  onRequest: (requestType: RequestType, payload?: { currentTime?: number; videoId?: string }) => void
  onApprove: (requestId: string) => void
  onReject: (requestId: string) => void
}

function requestLabel(requestType: RequestType): string {
  return requestType.replace('REQUEST_', '').replace('_', ' ')
}

export default function ActionRequestPanel({
  role,
  enabled,
  requests,
  notices,
  onRequest,
  onApprove,
  onReject,
}: ActionRequestPanelProps) {
  const [seekTime, setSeekTime] = useState('')
  const [videoInput, setVideoInput] = useState('')
  const isParticipant = role === 'PARTICIPANT' || role === 'VIEWER'
  const isReviewer = role === 'HOST' || role === 'MODERATOR'
  const pendingRequests = requests.filter((request) => request.status === 'PENDING')

  function requestSeek() {
    const currentTime = Number(seekTime)
    if (!Number.isFinite(currentTime) || currentTime < 0) return
    onRequest('REQUEST_SEEK', { currentTime })
    setSeekTime('')
  }

  function requestVideo() {
    const videoId = extractYouTubeVideoId(videoInput)
    if (!videoId) return
    onRequest('REQUEST_CHANGE_VIDEO', { videoId })
    setVideoInput('')
  }

  return (
    <section className="card card-body space-y-4" aria-label="Playback action requests">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
            {isReviewer ? 'Playback requests' : 'Request playback control'}
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-black)', opacity: 0.6 }}>
            {isReviewer
              ? 'Review pending participant requests.'
              : 'A host or moderator must approve these actions.'}
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <span
            className="rounded-full px-2 py-1 text-xs font-semibold"
            style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
          >
            {pendingRequests.length} pending
          </span>
        )}
      </div>

      {isParticipant && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!enabled}
              onClick={() => onRequest('REQUEST_PLAY')}
            >
              Request play
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!enabled}
              onClick={() => onRequest('REQUEST_PAUSE')}
            >
              Request pause
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="number"
              min="0"
              step="0.25"
              value={seekTime}
              onChange={(event) => setSeekTime(event.target.value)}
              placeholder="Seconds"
              aria-label="Requested seek time"
              disabled={!enabled}
              className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
            />
            <Button type="button" variant="secondary" size="sm" disabled={!enabled} onClick={requestSeek}>
              Request seek
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={videoInput}
              onChange={(event) => setVideoInput(event.target.value)}
              placeholder="YouTube link or video ID"
              aria-label="Requested video"
              disabled={!enabled}
              className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
            />
            <Button type="button" variant="secondary" size="sm" disabled={!enabled} onClick={requestVideo}>
              Request video
            </Button>
          </div>
        </div>
      )}

      {isReviewer && (
        <div className="space-y-2">
          {pendingRequests.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-black)', opacity: 0.55 }}>
              No pending requests.
            </p>
          ) : (
            pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: 'var(--color-muted)' }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-black)' }}>
                    @{request.username} requested {requestLabel(request.requestType).toLowerCase()}
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--color-black)', opacity: 0.55 }}>
                    {request.requestType === 'REQUEST_SEEK' && typeof request.payload === 'object' && request.payload !== null && 'currentTime' in request.payload
                      ? `Seek to ${String(request.payload.currentTime)} seconds`
                      : request.requestType === 'REQUEST_CHANGE_VIDEO' && typeof request.payload === 'object' && request.payload !== null && 'videoId' in request.payload
                        ? `Video ${String(request.payload.videoId)}`
                        : 'Playback action'}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <Button type="button" size="sm" variant="primary" onClick={() => onApprove(request.id)}>
                    Approve
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onReject(request.id)}>
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {notices.length > 0 && (
        <div className="space-y-1 border-t pt-3" style={{ borderColor: 'var(--color-muted)' }}>
          {notices.slice(-3).map((notice, index) => (
            <p key={`${notice}-${index}`} className="text-xs" style={{ color: 'var(--color-black)', opacity: 0.65 }}>
              {notice}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
