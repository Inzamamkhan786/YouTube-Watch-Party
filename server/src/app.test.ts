import { describe, expect, it } from 'vitest'
import { createApp } from './app'

describe('server app config', () => {
  it('trusts proxy headers so the rate limiter can use forwarded IPs behind Render', () => {
    const app = createApp()

    expect(app.get('trust proxy')).toBe(1)
  })
})
