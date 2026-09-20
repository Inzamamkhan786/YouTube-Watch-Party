import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

const YOUTUBE_API_SRC = 'https://www.youtube.com/iframe_api'
const YOUTUBE_ENDED = 0
const YOUTUBE_UNSTARTED = -1
let youtubeApiPromise = null

export function loadYouTubeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'))
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    let resolved = false
    let pollTimer = null

    const cleanup = () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer)
        pollTimer = null
      }
    }

    const onReady = () => {
      if (resolved) return
      if (window.YT?.Player) {
        resolved = true
        cleanup()
        resolve(window.YT)
      }
    }

    // Chain previous onYouTubeIframeAPIReady callback if set
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      try {
        previousReady?.()
      } catch (err) {
        console.warn('[YouTube API] Error in existing onYouTubeIframeAPIReady:', err)
      }
      onReady()
    }

    // Also poll in case the API script loaded before the handler was wired or onYouTubeIframeAPIReady already fired
    let pollCount = 0
    pollTimer = window.setInterval(() => {
      pollCount++
      if (window.YT?.Player) {
        onReady()
      } else if (pollCount > 100) { // 10 seconds timeout
        cleanup()
        youtubeApiPromise = null
        if (!resolved) {
          resolved = true
          reject(new Error('YouTube IFrame API timed out while loading.'))
        }
      }
    }, 100)

    // Check if script tag is already in DOM
    const existingScript = document.querySelector(
      `script[src="${YOUTUBE_API_SRC}"]`
    )

    if (!existingScript) {
      const script = document.createElement('script')
      script.src = YOUTUBE_API_SRC
      script.async = true
      script.onerror = () => {
        cleanup()
        youtubeApiPromise = null
        if (!resolved) {
          resolved = true
          reject(new Error('Unable to download the YouTube IFrame API script.'))
        }
      }
      document.head.appendChild(script)
    }
  })

  return youtubeApiPromise
}

const YouTubePlayer = forwardRef(function YouTubePlayer(
  { videoId, onReady, onStateChange, onEnded, onError },
  ref
) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [initRetryCount, setInitRetryCount] = useState(0)

  // Keep track of the currently loaded or cued video ID reliably
  const currentLoadedVideoIdRef = useRef(videoId)
  const callbacksRef = useRef({ onReady, onStateChange, onEnded, onError })
  callbacksRef.current = { onReady, onStateChange, onEnded, onError }

  useImperativeHandle(ref, () => ({
    isReady: () => ready && Boolean(playerRef.current),
    getCurrentTime: () => {
      const player = playerRef.current
      if (!player || typeof player.getCurrentTime !== 'function') return 0
      const time = player.getCurrentTime()
      return Number.isFinite(time) ? Math.max(0, time) : 0
    },
    getDuration: () => {
      const player = playerRef.current
      if (!player || typeof player.getDuration !== 'function') return 0
      const duration = player.getDuration()
      return Number.isFinite(duration) ? Math.max(0, duration) : 0
    },
    getPlayerState: () => {
      const player = playerRef.current
      if (!player || typeof player.getPlayerState !== 'function') return YOUTUBE_UNSTARTED
      const state = player.getPlayerState()
      return typeof state === 'number' ? state : YOUTUBE_UNSTARTED
    },
    getVideoId: () => {
      const player = playerRef.current
      const videoData =
        player && typeof player.getVideoData === 'function' ? player.getVideoData() : null
      return videoData?.video_id || currentLoadedVideoIdRef.current || null
    },
    play: () => {
      const player = playerRef.current
      if (player && typeof player.playVideo === 'function') {
        player.playVideo()
      }
    },
    pause: () => {
      const player = playerRef.current
      if (player && typeof player.pauseVideo === 'function') {
        player.pauseVideo()
      }
    },
    seekTo: (seconds) => {
      const player = playerRef.current
      const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(safeSeconds, true)
      }
    },
    loadVideo: (nextVideoId, seconds, autoplay) => {
      const player = playerRef.current
      if (!player) return
      const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
      currentLoadedVideoIdRef.current = nextVideoId

      if (autoplay && typeof player.loadVideoById === 'function') {
        player.loadVideoById(nextVideoId, safeSeconds)
      } else if (typeof player.cueVideoById === 'function') {
        player.cueVideoById(nextVideoId, safeSeconds)
      }
    },
  }), [ready])

  // Handle videoId prop changes after the player is ready
  useEffect(() => {
    if (!playerRef.current || !ready || !videoId) return

    // If the video ID changed from what is currently loaded, cue the new video
    if (currentLoadedVideoIdRef.current !== videoId) {
      currentLoadedVideoIdRef.current = videoId
      if (typeof playerRef.current.cueVideoById === 'function') {
        playerRef.current.cueVideoById(videoId, 0)
      }
    }
  }, [videoId, ready])

  // Initialize the YouTube Player instance
  useEffect(() => {
    let disposed = false
    setLoadError(null)

    if (!containerRef.current) return

    // Create an internal target element so YouTube API iframe replacement
    // doesn't destroy React's containerRef DOM node
    containerRef.current.innerHTML = ''
    const playerTarget = document.createElement('div')
    playerTarget.className = 'w-full h-full'
    containerRef.current.appendChild(playerTarget)

    loadYouTubeApi()
      .then((youtube) => {
        if (disposed || !containerRef.current || playerRef.current) return

        currentLoadedVideoIdRef.current = videoId

        playerRef.current = new youtube.Player(playerTarget, {
          width: '100%',
          height: '100%',
          videoId: videoId ?? undefined,
          playerVars: {
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (disposed) return
              setReady(true)
              currentLoadedVideoIdRef.current = videoId
              callbacksRef.current.onReady?.()
            },
            onStateChange: (event) => {
              if (disposed) return
              callbacksRef.current.onStateChange?.(event.data)
              if (event.data === YOUTUBE_ENDED) {
                callbacksRef.current.onEnded?.()
              }
            },
            onError: (event) => {
              if (disposed) return
              let message = 'YouTube could not load this video.'
              if (event.data === 2) {
                message = 'Invalid YouTube video ID.'
              } else if (event.data === 101 || event.data === 150) {
                message = 'The owner of this video does not allow it to be embedded.'
              }
              setLoadError(message)
              callbacksRef.current.onError?.(message)
            },
          },
        })
      })
      .catch((error) => {
        if (disposed) return
        const msg = error instanceof Error ? error.message : 'Unable to initialize YouTube.'
        setLoadError(msg)
        callbacksRef.current.onError?.(msg)
      })

    return () => {
      disposed = true
      try {
        playerRef.current?.destroy()
      } catch (err) {
        console.warn('[YouTube Player] Error during destroy:', err)
      }
      playerRef.current = null
      setReady(false)
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [initRetryCount])

  return (
    <div
      className="relative h-full min-h-[18rem] w-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-black)' }}
    >
      {/* Player host element */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Placeholder when no video ID has been configured */}
      {!videoId && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
          style={{ color: 'var(--color-white)', opacity: 0.75 }}
        >
          <svg
            className="w-12 h-12 mb-2 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium">Add a YouTube video to start the party.</p>
        </div>
      )}

      {/* Loading state indicator */}
      {videoId && !ready && !loadError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-black/70 backdrop-blur-sm z-10"
          style={{ color: 'var(--color-white)' }}
        >
          <div
            className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin mb-3"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <p className="text-xs font-medium tracking-wide">Loading YouTube player...</p>
        </div>
      )}

      {/* Error state fallback with retry */}
      {loadError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-black/85 z-20"
          style={{ color: 'var(--color-white)' }}
        >
          <p className="text-sm font-medium mb-1 text-red-400">{loadError}</p>
          <p className="text-xs opacity-75 mb-3">Check the YouTube URL or permissions.</p>
          <button
            type="button"
            onClick={() => setInitRetryCount((c) => c + 1)}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
          >
            Retry Player
          </button>
        </div>
      )}
    </div>
  )
})

export default YouTubePlayer
