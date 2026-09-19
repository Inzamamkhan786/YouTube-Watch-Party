const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (VIDEO_ID.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)

    if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) {
      const pathId = url.pathname.split('/').filter(Boolean)[0]
      return pathId && VIDEO_ID.test(pathId) ? pathId : null
    }

    if (url.hostname.includes('youtube.com')) {
      const pathSegments = url.pathname.split('/').filter(Boolean)
      const shortPathId = pathSegments[0] === 'shorts' || pathSegments[0] === 'embed' || pathSegments[0] === 'live'
        ? pathSegments[1]
        : null
      if (shortPathId && VIDEO_ID.test(shortPathId)) return shortPathId

      const queryId = url.searchParams.get('v')
      return queryId && VIDEO_ID.test(queryId) ? queryId : null
    }

    return null
  } catch {
    return null
  }
}
