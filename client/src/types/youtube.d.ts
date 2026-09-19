declare namespace YT {
  const PlayerState: {
    readonly UNSTARTED: -1
    readonly ENDED: 0
    readonly PLAYING: 1
    readonly PAUSED: 2
    readonly BUFFERING: 3
    readonly CUED: 5
  }

  interface PlayerOptions {
    height?: string
    width?: string
    videoId?: string
    playerVars?: Record<string, number | string>
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (event: OnStateChangeEvent) => void
      onError?: (event: OnErrorEvent) => void
    }
  }

  interface PlayerEvent {
    target: Player
  }

  interface OnStateChangeEvent extends PlayerEvent {
    data: number
  }

  interface OnErrorEvent extends PlayerEvent {
    data: number
  }

  class Player {
    constructor(element: string | HTMLElement, options: PlayerOptions)
    destroy(): void
    cueVideoById(videoId: string, startSeconds?: number): void
    loadVideoById(videoId: string, startSeconds?: number): void
    playVideo(): void
    pauseVideo(): void
    seekTo(seconds: number, allowSeekAhead?: boolean): void
    getCurrentTime(): number
    getDuration(): number
    getPlayerState(): number
    getVideoData(): { video_id?: string }
  }
}

interface Window {
  YT?: typeof YT
  onYouTubeIframeAPIReady?: () => void
}
