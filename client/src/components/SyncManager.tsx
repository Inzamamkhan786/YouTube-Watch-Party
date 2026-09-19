import { useEffect, useRef } from 'react'
import type { RoomSocket, RoomSocketState } from '../services/socket'
import type { YouTubePlayerHandle } from './YouTubePlayer'

const DRIFT_THRESHOLD_SECONDS = 1.5
const PLAYING = 1
const PAUSED = 2
const CUED = 5

interface SyncManagerProps {
  socket: RoomSocket | null
  state: RoomSocketState | null
  player: YouTubePlayerHandle | null
  playerReady: boolean
  onState: (state: RoomSocketState) => void
}

function effectiveTime(state: RoomSocketState): number {
  const elapsed = state.isPlaying
    ? (Date.now() - Date.parse(state.stateUpdatedAt)) / 1000
    : 0
  return Math.max(0, state.currentTime + elapsed)
}

export default function SyncManager({
  socket,
  state,
  player,
  playerReady,
  onState,
}: SyncManagerProps) {
  const stateRef = useRef<RoomSocketState | null>(state)
  stateRef.current = state

  useEffect(() => {
    if (!socket) return
    const handleState = (nextState: RoomSocketState) => {
      stateRef.current = nextState
      onState(nextState)
    }
    socket.on('sync_state', handleState)
    return () => {
      socket.off('sync_state', handleState)
    }
  }, [onState, socket])

  useEffect(() => {
    if (!playerReady || !player) return

    const applyState = () => {
      const currentState = stateRef.current
      if (!currentState || !currentState.videoId || !player.isReady()) return

      const targetTime = effectiveTime(currentState)
      if (player.getVideoId() !== currentState.videoId) {
        player.loadVideo(currentState.videoId, targetTime, currentState.isPlaying)
        return
      }

      const localTime = player.getCurrentTime()
      if (Math.abs(localTime - targetTime) > DRIFT_THRESHOLD_SECONDS) {
        player.seekTo(targetTime)
      }

      const localPlayerState = player.getPlayerState()
      if (currentState.isPlaying) {
        if (localPlayerState !== PLAYING) player.play()
      } else if (localPlayerState !== PAUSED && localPlayerState !== CUED) {
        player.pause()
      }
    }

    applyState()
    const interval = window.setInterval(applyState, 1000)
    return () => window.clearInterval(interval)
  }, [player, playerReady])

  return null
}
