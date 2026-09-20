const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export function validVideoId(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = value.trim()
  return VIDEO_ID.test(cleaned) ? cleaned : null
}

/**
 * Extracts an 11-character YouTube video ID from various YouTube URL formats or raw IDs.
 * Supports:
 * - Direct ID: dQw4w9WgXcQ
 * - Standard: https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - Short: https://youtu.be/dQw4w9WgXcQ
 * - Shorts: https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - Embed: https://www.youtube.com/embed/dQw4w9WgXcQ
 * - Live: https://www.youtube.com/live/dQw4w9WgXcQ
 * - Legacy: https://www.youtube.com/v/dQw4w9WgXcQ
 * - No-cookie: https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ
 * - Music: https://music.youtube.com/watch?v=dQw4w9WgXcQ
 * - Mobile: https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - URLs without scheme: youtu.be/dQw4w9WgXcQ or youtube.com/watch?v=dQw4w9WgXcQ
 * - Extra parameters: ?t=10s, &feature=shared, ?si=...
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null
  let trimmed = input.trim()
  if (!trimmed) return null

  // Strip wrapping angle brackets or quotes if present: <http...> or "http..."
  trimmed = trimmed.replace(/^[<"']+|[>"']+$/g, '').trim()

  const directId = validVideoId(trimmed)
  if (directId) return directId

  try {
    const normalizedInput = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`
    const url = new URL(normalizedInput)
    const host = url.hostname.toLowerCase()

    // 1. Check query parameter `v` (used by standard watch, m.youtube.com, music.youtube.com, etc.)
    const queryId = url.searchParams.get('v')
    const validQueryId = validVideoId(queryId)
    if (validQueryId) return validQueryId

    // 2. youtu.be domain (e.g. youtu.be/dQw4w9WgXcQ)
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const pathSegments = url.pathname.split('/').filter(Boolean)
      if (pathSegments.length > 0) {
        const idCandidate = pathSegments[0]
        if (validVideoId(idCandidate)) return idCandidate
      }
      return null
    }

    // 3. youtube.com or youtube-nocookie.com paths
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const pathSegments = url.pathname.split('/').filter(Boolean)
      if (pathSegments.length >= 2) {
        const prefix = pathSegments[0].toLowerCase()
        if (prefix === 'shorts' || prefix === 'embed' || prefix === 'live' || prefix === 'v') {
          const validPathId = validVideoId(pathSegments[1])
          if (validPathId) return validPathId
        }
      } else if (pathSegments.length === 1) {
        // e.g. youtube.com/embed/ID where split gives [embed, ID] or something similar
        const validPathId = validVideoId(pathSegments[0])
        if (validPathId) return validPathId
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Checks if non-empty input is a valid YouTube URL or video ID.
 */
export function isValidYouTubeInput(input: string): boolean {
  if (!input.trim()) return false
  return extractYouTubeVideoId(input) !== null
}
