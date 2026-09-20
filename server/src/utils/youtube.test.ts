import { describe, expect, it } from 'vitest'
import { extractYouTubeVideoId, isValidYouTubeInput, validVideoId } from './youtube'

describe('YouTube Video URL Parsing & Validation', () => {
  const EXPECTED_ID = 'dQw4w9WgXcQ'

  describe('validVideoId', () => {
    it('accepts valid 11-character video IDs', () => {
      expect(validVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(validVideoId('M7lc1UVf-VE')).toBe('M7lc1UVf-VE')
      expect(validVideoId('12345678901')).toBe('12345678901')
    })

    it('rejects invalid video IDs', () => {
      expect(validVideoId('')).toBeNull()
      expect(validVideoId(null)).toBeNull()
      expect(validVideoId(undefined)).toBeNull()
      expect(validVideoId('tooShort')).toBeNull()
      expect(validVideoId('wayTooLongVideoIdentifier123')).toBeNull()
      expect(validVideoId('invalid$char!')).toBeNull()
    })
  })

  describe('extractYouTubeVideoId', () => {
    it('extracts raw 11-character video ID directly', () => {
      expect(extractYouTubeVideoId(EXPECTED_ID)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId('  dQw4w9WgXcQ  ')).toBe(EXPECTED_ID)
    })

    it('extracts ID from standard watch URLs', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`http://www.youtube.com/watch?v=${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`www.youtube.com/watch?v=${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`youtube.com/watch?v=${EXPECTED_ID}`)).toBe(EXPECTED_ID)
    })

    it('extracts ID from URLs with additional query parameters and timestamps', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${EXPECTED_ID}&t=45s`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`https://www.youtube.com/watch?feature=shared&v=${EXPECTED_ID}&list=PL123`)).toBe(EXPECTED_ID)
    })

    it('extracts ID from youtu.be short links', () => {
      expect(extractYouTubeVideoId(`https://youtu.be/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`http://youtu.be/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`youtu.be/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`https://youtu.be/${EXPECTED_ID}?si=abcd1234efgh5678`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`https://youtu.be/${EXPECTED_ID}?t=120`)).toBe(EXPECTED_ID)
    })

    it('extracts ID from shorts URLs', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`https://youtube.com/shorts/${EXPECTED_ID}?feature=share`)).toBe(EXPECTED_ID)
    })

    it('extracts ID from embed URLs', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`https://www.youtube-nocookie.com/embed/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${EXPECTED_ID}?autoplay=1`)).toBe(EXPECTED_ID)
    })

    it('extracts ID from live and legacy URLs', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/live/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`https://www.youtube.com/v/${EXPECTED_ID}`)).toBe(EXPECTED_ID)
    })

    it('extracts ID from music and mobile URLs', () => {
      expect(extractYouTubeVideoId(`https://music.youtube.com/watch?v=${EXPECTED_ID}`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`https://m.youtube.com/watch?v=${EXPECTED_ID}`)).toBe(EXPECTED_ID)
    })

    it('handles angle brackets or quotes around URL', () => {
      expect(extractYouTubeVideoId(`<https://www.youtube.com/watch?v=${EXPECTED_ID}>`)).toBe(EXPECTED_ID)
      expect(extractYouTubeVideoId(`"https://youtu.be/${EXPECTED_ID}"`)).toBe(EXPECTED_ID)
    })

    it('returns null for invalid inputs', () => {
      expect(extractYouTubeVideoId('')).toBeNull()
      expect(extractYouTubeVideoId('   ')).toBeNull()
      expect(extractYouTubeVideoId('https://google.com')).toBeNull()
      expect(extractYouTubeVideoId('https://vimeo.com/123456789')).toBeNull()
      expect(extractYouTubeVideoId('not-a-valid-video-url')).toBeNull()
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull()
    })
  })

  describe('isValidYouTubeInput', () => {
    it('returns true for valid links and false for invalid ones', () => {
      expect(isValidYouTubeInput(EXPECTED_ID)).toBe(true)
      expect(isValidYouTubeInput(`https://www.youtube.com/watch?v=${EXPECTED_ID}`)).toBe(true)
      expect(isValidYouTubeInput(`https://youtu.be/${EXPECTED_ID}`)).toBe(true)
      expect(isValidYouTubeInput('')).toBe(false)
      expect(isValidYouTubeInput('invalid')).toBe(false)
      expect(isValidYouTubeInput('https://notyoutube.com/watch?v=12345')).toBe(false)
    })
  })
})
