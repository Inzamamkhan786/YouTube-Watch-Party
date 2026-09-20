const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

function validVideoId(value: string | null): string | null {
  if (!value) return null
  const cleaned = value.trim()
  return VIDEO_ID.test(cleaned) ? cleaned : null
}

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const directId = validVideoId(trimmed)
  if (directId) return directId

  try {
    const normalizedInput = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    const url = new URL(normalizedInput)
    const host = url.hostname.toLowerCase()

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const pathId = url.pathname.split('/').filter(Boolean)[0]
      return validVideoId(pathId)
    }

    if (host.includes('youtube.com')) {
      const pathSegments = url.pathname.split('/').filter(Boolean)
      const shortPathId =
        pathSegments[0] === 'shorts' || pathSegments[0] === 'embed' || pathSegments[0] === 'live'
          ? pathSegments[1]
          : null

      if (validVideoId(shortPathId)) return shortPathId

      const queryId = url.searchParams.get('v')
      return validVideoId(queryId)
    }

    return null
  } catch {
    return null
  }
}
