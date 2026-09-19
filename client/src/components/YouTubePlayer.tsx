import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react'

const YOUTUBE_API_SRC = 'https://www.youtube.com/iframe_api'
const YOUTUBE_ENDED = 0
const YOUTUBE_UNSTARTED = -1
let youtubeApiPromise: Promise<typeof YT> | null = null

function loadYouTubeApi(): Promise<typeof YT> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      if (window.YT?.Player) {
        resolve(window.YT)
      } else {
        reject(new Error('YouTube IFrame API did not initialize.'))
      }
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_API_SRC}"]`
    )
    if (existingScript) return

    const script = document.createElement('script')
    script.src = YOUTUBE_API_SRC
    script.async = true
    script.onerror = () => reject(new Error('Unable to load the YouTube IFrame API.'))
    document.head.appendChild(script)
  })

  return youtubeApiPromise
}

export interface YouTubePlayerHandle {
  isReady: () => boolean
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  getVideoId: () => string | null
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  loadVideo: (videoId: string, seconds: number, autoplay: boolean) => void
}

interface YouTubePlayerProps {
  videoId: string | null
  onReady?: () => void
  onStateChange?: (state: number) => void
  onEnded?: () => void
  onError?: (message: string) => void
}

const YouTubePlayer = forwardRef(function YouTubePlayer(
  { videoId, onReady, onStateChange, onEnded, onError }: YouTubePlayerProps,
  ref: Ref<YouTubePlayerHandle>
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const [ready, setReady] = useState(false)
  const callbacksRef = useRef({ onReady, onStateChange, onEnded, onError })
  callbacksRef.current = { onReady, onStateChange, onEnded, onError }

  useImperativeHandle(ref, () => ({
    isReady: () => ready && Boolean(playerRef.current),
    getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
    getDuration: () => playerRef.current?.getDuration() ?? 0,
    getPlayerState: () => playerRef.current?.getPlayerState() ?? YOUTUBE_UNSTARTED,
    getVideoId: () => playerRef.current?.getVideoData().video_id ?? null,
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    seekTo: (seconds) => playerRef.current?.seekTo(Math.max(0, seconds), true),
    loadVideo: (nextVideoId, seconds, autoplay) => {
      if (!playerRef.current) return
      if (autoplay) {
        playerRef.current.loadVideoById(nextVideoId, Math.max(0, seconds))
      } else {
        playerRef.current.cueVideoById(nextVideoId, Math.max(0, seconds))
      }
    },
  }), [ready])

  useEffect(() => {
    let disposed = false

    void loadYouTubeApi()
      .then((youtube) => {
        if (disposed || !containerRef.current || playerRef.current) return

        playerRef.current = new youtube.Player(containerRef.current, {
          width: '100%',
          height: '100%',
          videoId: videoId ?? undefined,
          playerVars: {
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              if (disposed) return
              setReady(true)
              callbacksRef.current.onReady?.()
            },
            onStateChange: (event) => {
              callbacksRef.current.onStateChange?.(event.data)
              if (event.data === YOUTUBE_ENDED) {
                callbacksRef.current.onEnded?.()
              }
            },
            onError: (event) => {
              const message =
                event.data === 2
                  ? 'YouTube rejected this video ID.'
                  : 'YouTube could not load this video.'
              callbacksRef.current.onError?.(message)
            },
          },
        })
      })
      .catch((error: unknown) => {
        callbacksRef.current.onError?.(
          error instanceof Error ? error.message : 'Unable to initialize YouTube.'
        )
      })

    return () => {
      disposed = true
      playerRef.current?.destroy()
      playerRef.current = null
      setReady(false)
    }
  }, [])

  return (
    <div
      className="relative h-full min-h-[18rem] w-full overflow-hidden"
      style={{ backgroundColor: 'var(--color-black)' }}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {!videoId && (
        <div
          className="absolute inset-0 flex items-center justify-center text-center text-sm"
          style={{ color: 'var(--color-white)', opacity: 0.7 }}
        >
          Add a YouTube video to start the party.
        </div>
      )}
    </div>
  )
})

export default YouTubePlayer
