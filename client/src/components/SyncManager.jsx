import { useEffect, useRef } from 'react'

const DRIFT_THRESHOLD_SECONDS = 1.5
const PLAYING = 1

function effectiveTime(state) {
  const parsed = state.stateUpdatedAt ? Date.parse(state.stateUpdatedAt) : NaN
  const elapsed = state.isPlaying && Number.isFinite(parsed)
    ? Math.max(0, (Date.now() - parsed) / 1000)
    : 0
  const base = Number.isFinite(state.currentTime) ? Math.max(0, state.currentTime) : 0
  return base + elapsed
}

export default function SyncManager({
  socket,
  state,
  player,
  playerReady,
  onState,
}) {
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!socket) return
    const handleState = (nextState) => {
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
      const currentVideoId = player.getVideoId()

      // Only switch video if player has reported an ID and it really differs from target video
      if (currentVideoId && currentVideoId !== currentState.videoId) {
        player.loadVideo(currentState.videoId, targetTime, currentState.isPlaying)
        return
      }

      const localPlayerState = player.getPlayerState()

      // When the server says isPlaying: true
      if (currentState.isPlaying) {
        const localTime = player.getCurrentTime()
        if (Number.isFinite(localTime) && Math.abs(localTime - targetTime) > DRIFT_THRESHOLD_SECONDS) {
          player.seekTo(targetTime)
        }
        if (localPlayerState !== PLAYING) {
          player.play()
        }
      } else {
        // When the server says isPlaying: false
        if (localPlayerState === PLAYING) {
          player.pause()
        }
        const localTime = player.getCurrentTime()
        if (Number.isFinite(localTime) && Math.abs(localTime - targetTime) > DRIFT_THRESHOLD_SECONDS) {
          player.seekTo(targetTime)
        }
      }
    }

    applyState()
    const interval = window.setInterval(applyState, 1000)
    return () => window.clearInterval(interval)
  }, [player, playerReady])

  return null
}
