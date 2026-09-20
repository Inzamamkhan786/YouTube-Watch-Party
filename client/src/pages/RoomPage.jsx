import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getRoomApi, getRoomMembersApi, joinRoomApi } from '../services/room'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../utils/constants'
import { createRoomSocket } from '../services/socket'
import YouTubePlayer from '../components/YouTubePlayer'
import PlaybackControls from '../components/PlaybackControls'
import VideoInput from '../components/VideoInput'
import SyncManager from '../components/SyncManager'
import ActionRequestPanel from '../components/ActionRequestPanel'
import ChatPanel from '../components/ChatPanel'
import ReactionPanel from '../components/ReactionPanel'
import Button from '../components/ui/Button'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import Toast from '../components/ui/Toast'

function getPlayerMetric(player, method, fallback) {
  if (!player || typeof player[method] !== 'function') {
    return fallback
  }

  return player[method]()
}

function RoleBadge({ role }) {
  if (role === 'HOST') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider"
        style={{
          backgroundColor: 'var(--color-primary-soft)',
          color: 'var(--color-primary)',
        }}
      >
        Host
      </span>
    )
  }

  if (role === 'MODERATOR') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider"
        style={{
          backgroundColor: 'var(--color-muted)',
          color: 'var(--color-blue)',
        }}
      >
        Mod
      </span>
    )
  }

  if (role === 'VIEWER') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
        style={{
          backgroundColor: 'var(--color-muted)',
          color: 'var(--color-black)',
          opacity: 0.8,
        }}
      >
        Viewer
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: 'var(--color-muted)',
        color: 'var(--color-black)',
        opacity: 0.75,
      }}
    >
      Participant
    </span>
  )
}

export default function RoomPage() {
  const { roomCode } = useParams()
  const { user, token } = useAuth()

  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [socketError, setSocketError] = useState(null)
  const [removedMessage, setRemovedMessage] = useState(null)
  const [requests, setRequests] = useState([])
  const [requestNotices, setRequestNotices] = useState([])
  const [roomSocket, setRoomSocket] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING')
  const [playerReady, setPlayerReady] = useState(false)
  const [displayTime, setDisplayTime] = useState(0)
  const [displayDuration, setDisplayDuration] = useState(0)
  const playerRef = useRef(null)
  const socketRef = useRef(null)

  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Load room data & members
  const loadRoom = useCallback(async () => {
    if (!roomCode) return
    setError(null)

    try {
      // 1. Fetch room details
      let currentRoom
      try {
        currentRoom = await getRoomApi(roomCode)
      } catch {
        // Try auto-joining via room link if not yet joined
        const joinResult = await joinRoomApi(roomCode)
        currentRoom = joinResult.room
      }

      // If user is not yet a member in room response, join automatically
      if (!currentRoom.currentUserMembership) {
        const joinResult = await joinRoomApi(roomCode)
        currentRoom = joinResult.room
      }

      setRoom(currentRoom)

      // 2. Fetch room members
      const memberList = await getRoomMembersApi(currentRoom.id)
      setMembers(memberList)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load room details.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [roomCode])

  useEffect(() => {
    void loadRoom()
  }, [loadRoom])

  const applyMemberSnapshot = useCallback(
    (nextMembers) => {
      setMembers(nextMembers)
      const currentMember = nextMembers.find((member) => member.user.id === user?.id)
      if (!currentMember) return

      setRoom((currentRoom) =>
        currentRoom?.currentUserMembership
          ? {
              ...currentRoom,
              currentUserMembership: {
                ...currentRoom.currentUserMembership,
                role: currentMember.role,
              },
            }
          : currentRoom
      )
    },
    [user?.id]
  )

  useEffect(() => {
    if (!room || !roomCode || !token) return

    const socket = createRoomSocket(token)
    let disposed = false
    let hasConnected = false
    socketRef.current = socket
    setRoomSocket(socket)
    setConnectionStatus('CONNECTING')

    socket.on('user_joined', (presence) => {
      setMembers((currentMembers) => {
        if (currentMembers.some((member) => member.user.id === presence.userId)) {
          return currentMembers
        }

        return [
          ...currentMembers,
          {
            id: `${presence.roomId}:${presence.userId}`,
            role: presence.role,
            joinedAt: presence.joinedAt,
            user: {
              id: presence.userId,
              username: presence.username,
            },
          },
        ]
      })
    })

    socket.on('user_left', (presence) => {
      setMembers((currentMembers) =>
        currentMembers.filter((member) => member.user.id !== presence.userId)
      )
    })

    socket.on('role_assigned', (payload) => {
      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.user.id === payload.userId
            ? { ...member, role: payload.role }
            : member
        )
      )
      if (payload.userId === user?.id) {
        setRoom((currentRoom) =>
          currentRoom?.currentUserMembership
            ? {
                ...currentRoom,
                currentUserMembership: {
                  ...currentRoom.currentUserMembership,
                  role: payload.role,
                },
              }
            : currentRoom
        )
      }
    })

    socket.on('members_updated', (payload) => {
      applyMemberSnapshot(payload.members)
      const currentMember = payload.members.find((member) => member.user.id === user?.id)
      if (
        currentMember &&
        currentMember.role !== 'PARTICIPANT' &&
        currentMember.role !== 'VIEWER'
      ) {
        socket.emit('get_pending_requests', { roomCode: payload.roomCode })
      }
    })

    socket.on('host_transferred', (payload) => {
      applyMemberSnapshot(payload.members)
    })

    socket.on('participant_removed', (payload) => {
      if (payload.userId === user?.id) {
        setRemovedMessage(payload.message)
      } else {
        setMembers((currentMembers) =>
          currentMembers.filter((member) => member.user.id !== payload.userId)
        )
      }
    })

    socket.on('request_created', (request) => {
      setRequests((currentRequests) => [
        ...currentRequests.filter((current) => current.id !== request.id),
        request,
      ])
      if (request.userId === user?.id) {
        setRequestNotices((currentNotices) => [
          ...currentNotices,
          'Your playback request is pending review.',
        ])
      }
    })

    socket.on('pending_requests', (payload) => {
      setRequests(payload.requests)
    })

    socket.on('request_updated', ({ request, message }) => {
      setRequests((currentRequests) => [
        ...currentRequests.filter((current) => current.id !== request.id),
        request,
      ])
      if (
        request.userId === user?.id ||
        (room.currentUserMembership?.role !== 'PARTICIPANT' &&
          room.currentUserMembership?.role !== 'VIEWER')
      ) {
        setRequestNotices((currentNotices) => [...currentNotices, message])
      }
    })

    socket.on('socket_error', ({ message }) => {
      setSocketError(message)
    })

    const handleConnect = () => {
      hasConnected = true
      if (!disposed) setConnectionStatus('CONNECTING')
      socket.emit('join_room', { roomCode: room.roomCode }, (response) => {
        if (disposed) return
        if (!response.ok) {
          setConnectionStatus('DISCONNECTED')
          setSocketError(response.error ?? 'Could not join the real-time room.')
          return
        }
        setConnectionStatus('CONNECTED')
        setSocketError(null)
        if (
          room.currentUserMembership?.role !== 'PARTICIPANT' &&
          room.currentUserMembership?.role !== 'VIEWER'
        ) {
          socket.emit('get_pending_requests', { roomCode: room.roomCode })
        }
      })
    }
    const handleConnectError = (socketErr) => {
      if (disposed) return
      setConnectionStatus(hasConnected ? 'RECONNECTING' : 'DISCONNECTED')
      setSocketError(socketErr?.message || 'Real-time connection failed.')
    }
    const handleDisconnect = () => {
      if (disposed) return
      setConnectionStatus(hasConnected ? 'RECONNECTING' : 'DISCONNECTED')
    }
    const handleOffline = () => {
      if (!disposed) setConnectionStatus('DISCONNECTED')
    }
    const handleOnline = () => {
      if (!disposed && !socket.connected) {
        setConnectionStatus('RECONNECTING')
        socket.connect()
      }
    }
    const handleVisibilityChange = () => {
      if (!disposed && document.visibilityState === 'visible' && !socket.connected) {
        setConnectionStatus('RECONNECTING')
        socket.connect()
      }
    }

    socket.on('connect', handleConnect)
    socket.on('connect_error', handleConnectError)
    socket.on('disconnect', handleDisconnect)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    socket.connect()

    return () => {
      disposed = true
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleConnectError)
      socket.off('disconnect', handleDisconnect)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (socket.connected) {
        socket.emit('leave_room', { roomCode: room.roomCode })
      }
      socket.disconnect()
      socket.removeAllListeners()
      socketRef.current = null
      setRoomSocket(null)
      setConnectionStatus('DISCONNECTED')
      setPlayerReady(false)
    }
  }, [applyMemberSnapshot, room?.id, room?.roomCode, roomCode, token, user?.id])

  const handleSyncState = useCallback((state) => {
    setRoom((currentRoom) =>
      currentRoom
        ? {
            ...currentRoom,
            currentVideoId: state.videoId,
            isPlaying: state.isPlaying,
            currentTime: state.currentTime,
            stateUpdatedAt: state.stateUpdatedAt,
          }
        : currentRoom
    )
  }, [])

  const canControlPlayback =
    room?.currentUserMembership?.role === 'HOST' ||
    room?.currentUserMembership?.role === 'MODERATOR'

  function emitPlayback(event, currentTime) {
    const socket = socketRef.current
    if (!socket || !room || !Number.isFinite(currentTime)) return
    socket.emit(event, { roomCode: room.roomCode, currentTime: Math.max(0, currentTime) })

    setRoom((currentRoom) =>
      currentRoom
        ? {
            ...currentRoom,
            isPlaying: event === 'play' ? true : event === 'pause' ? false : currentRoom.isPlaying,
            currentTime: event === 'seek' ? Math.max(0, currentTime) : currentRoom.currentTime,
            stateUpdatedAt: new Date().toISOString(),
          }
        : currentRoom
    )
    if (event === 'pause') playerRef.current?.pause()
    if (event === 'play') playerRef.current?.play()
  }

  function handleChangeVideo(videoId) {
    if (!room || !socketRef.current) return
    socketRef.current.emit('change_video', { roomCode: room.roomCode, videoId })
  }

  const handlePlayerStateChange = useCallback(
    (state) => {
      if (!canControlPlayback || !playerRef.current) return
      // YT.PlayerState.PLAYING is 1, PAUSED is 2
      if (state === 1 && !room?.isPlaying) {
        const time = playerRef.current.getCurrentTime()
        emitPlayback('play', Number.isFinite(time) ? time : room?.currentTime ?? 0)
      } else if (state === 2 && room?.isPlaying) {
        const time = playerRef.current.getCurrentTime()
        emitPlayback('pause', Number.isFinite(time) ? time : room?.currentTime ?? 0)
      }
    },
    [canControlPlayback, room?.isPlaying, room?.currentTime]
  )

  useEffect(() => {
    if (Number.isFinite(room?.currentTime)) {
      setDisplayTime(room?.currentTime ?? 0)
    }
  }, [room?.currentTime])

  useEffect(() => {
    if (!room?.isPlaying) return
    const interval = window.setInterval(() => {
      if (playerRef.current?.isReady()) {
        const t = playerRef.current.getCurrentTime()
        if (typeof t === 'number' && Number.isFinite(t)) setDisplayTime(t)
        const d = playerRef.current.getDuration()
        if (typeof d === 'number' && Number.isFinite(d) && d > 0) setDisplayDuration(d)
      } else if (room) {
        const parsed = Date.parse(room.stateUpdatedAt)
        const elapsed = Number.isFinite(parsed) ? (Date.now() - parsed) / 1000 : 0
        setDisplayTime(Math.max(0, (room.currentTime ?? 0) + elapsed))
      }
    }, 400)
    return () => window.clearInterval(interval)
  }, [room?.isPlaying, room?.currentTime, room?.stateUpdatedAt])

  function handlePlayerEnded() {
    if (!canControlPlayback) return
    emitPlayback('pause', getPlayerMetric(playerRef.current, 'getCurrentTime', room?.currentTime ?? 0))
  }

  function handleAssignRole(targetUserId, role) {
    if (!room || !socketRef.current) return
    socketRef.current.emit(
      'assign_role',
      { roomCode: room.roomCode, targetUserId, role },
      (response) => {
        if (!response.ok) setSocketError(response.error ?? 'Role update failed.')
      }
    )
  }

  function handleRemoveParticipant(targetUserId) {
    if (!room || !socketRef.current) return
    if (!window.confirm('Remove this participant from the room?')) return
    socketRef.current.emit(
      'remove_participant',
      { roomCode: room.roomCode, targetUserId },
      (response) => {
        if (!response.ok) setSocketError(response.error ?? 'Participant removal failed.')
      }
    )
  }

  function handleTransferHost(targetUserId) {
    if (!room || !socketRef.current) return
    if (!window.confirm('Transfer host ownership to this participant?')) return
    socketRef.current.emit(
      'transfer_host',
      {
        roomCode: room.roomCode,
        targetUserId,
        previousHostRole: 'PARTICIPANT',
      },
      (response) => {
        if (!response.ok) setSocketError(response.error ?? 'Host transfer failed.')
      }
    )
  }

  function handleRequest(requestType, payload) {
    if (!room || !socketRef.current) return
    socketRef.current.emit('request_action', { roomCode: room.roomCode, requestType, payload }, (response) => {
      if (!response.ok) setSocketError(response.error ?? 'Could not submit request.')
    })
  }

  function handleApproveRequest(requestId) {
    if (!room || !socketRef.current) return
    socketRef.current.emit('approve_request', { roomCode: room.roomCode, requestId }, (response) => {
      if (!response.ok) setSocketError(response.error ?? 'Could not approve request.')
    })
  }

  function handleRejectRequest(requestId) {
    if (!room || !socketRef.current) return
    if (!window.confirm('Reject this playback request?')) return
    socketRef.current.emit('reject_request', { roomCode: room.roomCode, requestId }, (response) => {
      if (!response.ok) setSocketError(response.error ?? 'Could not reject request.')
    })
  }

  // Copy Room Code
  function handleCopyCode() {
    if (!room) return
    void navigator.clipboard.writeText(room.roomCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Copy Full Room Link
  function handleCopyLink() {
    if (!room) return
    const url = `${window.location.origin}/room/${room.roomCode}`
    void navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (loading) {
    return (
      <div className="room-page space-y-4">
        <LoadingSkeleton className="h-8 w-2/5" label="Loading room header" />
        <div className="room-grid">
          <LoadingSkeleton className="aspect-video w-full" label="Loading video area" />
          <div className="space-y-4">
            <LoadingSkeleton className="h-48 w-full" label="Loading participants" />
            <LoadingSkeleton className="h-96 w-full" label="Loading chat" />
          </div>
        </div>
      </div>
    )
  }

  if (removedMessage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card card-body max-w-md w-full space-y-4 text-center">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-black)' }}>
            You left the SyncTube room
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-black)', opacity: 0.65 }}>
            {removedMessage}
          </p>
          <Link to={ROUTES.HOME}>
            <Button variant="primary" size="sm">Back Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="card card-body max-w-md w-full text-center space-y-4">
          <div
            className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-lg font-bold"
            style={{
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
            }}
          >
            !
          </div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-black)' }}>
            Room Unavailable
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-black)', opacity: 0.6 }}>
            {error ?? 'Could not find or join the requested SyncTube room.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to={ROUTES.ROOMS_JOIN}>
              <Button variant="secondary" size="sm">
                Join Another
              </Button>
            </Link>
            <Link to={ROUTES.HOME}>
              <Button variant="primary" size="sm">
                Back Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentUserRole = room.currentUserMembership?.role ?? 'PARTICIPANT'
  const playbackState = {
    roomId: room.id,
    roomCode: room.roomCode,
    videoId: room.currentVideoId ?? null,
    isPlaying: room.isPlaying,
    currentTime: room.currentTime,
    stateUpdatedAt: room.stateUpdatedAt,
  }

  return (
    <div className="room-page space-y-6">
      {/* ── Room Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-muted)' }}>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-black)' }}>
              {room.title}
            </h1>
            <RoleBadge role={currentUserRole} />
          </div>
          {room.description && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-black)', opacity: 0.6 }}>
              {room.description}
            </p>
          )}
        </div>

        {/* Action Controls: Copy Code & Copy Link */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Room Code Pill & Button */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono font-bold"
            style={{
              borderColor: 'var(--color-muted)',
              backgroundColor: 'var(--color-white)',
              color: 'var(--color-black)',
            }}
          >
            <span>CODE: {room.roomCode}</span>
            <button
              onClick={handleCopyCode}
              className="ml-1 hover:opacity-75 transition-opacity font-sans font-semibold text-xs"
              style={{ color: 'var(--color-blue)' }}
              title="Copy Room Code"
              id="copy-room-code-btn"
            >
              {copiedCode ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Copy Link Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
            id="copy-room-link-btn"
          >
            {copiedLink ? '✓ Link Copied!' : '🔗 Share Party Link'}
          </Button>
          <span
            className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] font-medium"
            style={{
              borderColor: 'var(--color-muted)',
              color: 'var(--color-black)',
              opacity: 0.72,
            }}
            role="status"
            aria-live="polite"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  connectionStatus === 'CONNECTED'
                    ? 'var(--color-blue)'
                    : connectionStatus === 'DISCONNECTED'
                      ? 'var(--color-primary)'
                      : 'var(--color-muted-dark)',
              }}
            />
            {connectionStatus}
          </span>
        </div>
      </div>

      <Toast message={socketError} onDismiss={() => setSocketError(null)} />

      {/* ── Main Stage & Participants Layout ── */}
      <div className="room-grid">
        {/* Left 2 Cols: Video Stage (Authoritative Playback State) */}
        <div className="room-main">
          <div className="room-video-card">
            <div className="aspect-video">
              <YouTubePlayer
                ref={playerRef}
                videoId={room.currentVideoId ?? null}
                onReady={() => {
                  setPlayerReady(true)
                  const d = playerRef.current?.getDuration()
                  if (typeof d === 'number' && Number.isFinite(d) && d > 0) setDisplayDuration(d)
                }}
                onStateChange={handlePlayerStateChange}
                onEnded={handlePlayerEnded}
                onError={setSocketError}
              />
            </div>
            {canControlPlayback && (
              <PlaybackControls
                canControl
                ready={playerReady && connectionStatus === 'CONNECTED'}
                isPlaying={room.isPlaying}
                currentTime={displayTime}
                duration={displayDuration || getPlayerMetric(playerRef.current, 'getDuration', 0)}
                onPlay={() => emitPlayback('play', getPlayerMetric(playerRef.current, 'getCurrentTime', displayTime))}
                onPause={() => emitPlayback('pause', getPlayerMetric(playerRef.current, 'getCurrentTime', displayTime))}
                onSeek={(seconds) => {
                  setDisplayTime(seconds)
                  emitPlayback('seek', seconds)
                }}
              />
            )}
          </div>

          {canControlPlayback && (
            <VideoInput
              disabled={connectionStatus !== 'CONNECTED'}
              onChangeVideo={handleChangeVideo}
            />
          )}

          <ActionRequestPanel
            role={currentUserRole}
            enabled={connectionStatus === 'CONNECTED'}
            requests={requests}
            notices={requestNotices}
            onRequest={handleRequest}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
          />

          <ReactionPanel
            socket={roomSocket}
            roomId={room.id}
            videoTime={displayTime}
            connected={connectionStatus === 'CONNECTED'}
          />

          <SyncManager
            socket={roomSocket}
            state={playbackState}
            player={playerReady ? playerRef.current : null}
            playerReady={playerReady}
            onState={handleSyncState}
          />

          {/* Party Quick Info Banner */}
          <div className="card card-body py-3 px-4 flex items-center justify-between text-xs">
            <span style={{ color: 'var(--color-black)', opacity: 0.7 }}>
              Hosted by <strong className="font-semibold">{room.host.displayName ?? room.host.username}</strong>
            </span>
            <span style={{ color: 'var(--color-black)', opacity: 0.7 }}>
              {members.length} {members.length === 1 ? 'member' : 'members'} online
            </span>
          </div>
        </div>

        {/* Right Col: Participant List and Chat */}
        <aside className="room-sidebar">
          <div className="room-participants card flex flex-col">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
                Participants ({members.length})
              </h2>
              <span className="text-xs" style={{ color: 'var(--color-muted-dark)' }}>
                Max {room.maxMembers}
              </span>
            </div>

            <div className="card-body p-4 flex-1 divide-y" style={{ borderColor: 'var(--color-muted)' }}>
              {members.length === 0 ? (
                <div className="flex min-h-24 items-center justify-center text-center text-xs" style={{ color: 'var(--color-black)', opacity: 0.55 }}>
                  No participants are connected yet.
                </div>
              ) : members.map((member) => {
                const isMe = member.user.id === user?.id
                const name = member.user.displayName ?? member.user.username

                return (
                  <div
                    key={member.id}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            backgroundColor:
                              member.role === 'HOST'
                                ? 'var(--color-primary-soft)'
                                : member.role === 'MODERATOR'
                                ? 'var(--color-muted)'
                                : 'var(--color-muted)',
                            color:
                              member.role === 'HOST'
                                ? 'var(--color-primary)'
                                : member.role === 'MODERATOR'
                                ? 'var(--color-blue)'
                                : 'var(--color-black)',
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>

                        {/* Name & Tag */}
                        <div className="truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className="text-xs font-semibold truncate"
                              style={{ color: 'var(--color-black)' }}
                            >
                              {name}
                            </span>
                            {isMe && (
                              <span
                                className="text-[10px] font-bold uppercase px-1 rounded"
                                style={{
                                  backgroundColor: 'var(--color-muted)',
                                  color: 'var(--color-black)',
                                  opacity: 0.6,
                                }}
                              >
                                You
                              </span>
                            )}
                          </div>
                          <span
                            className="text-[11px] block truncate"
                            style={{ color: 'var(--color-black)', opacity: 0.5 }}
                          >
                            @{member.user.username}
                          </span>
                        </div>
                      </div>

                      {/* Role Badge */}
                      <div className="flex-shrink-0">
                        <RoleBadge role={member.role} />
                      </div>
                    </div>

                    {/* Host Action Strip (Role selector, Transfer, Remove) */}
                    {currentUserRole === 'HOST' && !isMe && member.role !== 'HOST' && (
                      <div className="flex items-center justify-between gap-1.5 pl-10 sm:justify-end">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <select
                            aria-label={`Change role for ${name}`}
                            value={member.role}
                            onChange={(event) => {
                              const nextRole = event.target.value
                              if (
                                window.confirm(
                                  `Change ${name}'s role to ${nextRole.toLowerCase()}?`
                                )
                              ) {
                                handleAssignRole(member.user.id, nextRole)
                              }
                            }}
                            className="rounded border px-2 py-1 text-[11px] bg-white text-black cursor-pointer"
                            style={{ borderColor: 'var(--color-muted)' }}
                          >
                            <option value="PARTICIPANT">Participant</option>
                            <option value="VIEWER">Viewer</option>
                            <option value="MODERATOR">Moderator</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-[11px] px-2 py-1 h-7"
                            onClick={() => handleTransferHost(member.user.id)}
                            title={`Transfer host to ${name}`}
                          >
                            Transfer
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-[11px] px-2 py-1 h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveParticipant(member.user.id)}
                            title={`Remove ${name}`}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="room-chat">
            <ChatPanel
              socket={roomSocket}
              roomId={room.id}
              currentUserId={user?.id}
              canDelete={currentUserRole === 'HOST' || currentUserRole === 'MODERATOR'}
              connected={connectionStatus === 'CONNECTED'}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
