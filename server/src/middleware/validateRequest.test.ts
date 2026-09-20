import { describe, expect, it, vi } from 'vitest'
import { validateCreateRoom, validateLogin, validateRegister, validateRoomCodeParam } from './validateRequest'

function request(body: unknown, params: Record<string, string> = {}) {
  return { body, params } as never
}

describe('request validation', () => {
  it('accepts valid auth and room inputs', () => {
    const next = vi.fn()
    validateRegister(request({ username: 'viewer', email: 'viewer@example.com', password: 'password123' }), {} as never, next)
    validateLogin(request({ email: 'viewer@example.com', password: 'password123' }), {} as never, next)
    validateCreateRoom(request({ title: 'Movie Night', initialVideoId: 'dQw4w9WgXcQ' }), {} as never, next)
    validateRoomCodeParam(request({}, { roomCode: 'ABC234' }), {} as never, next)
    expect(next).toHaveBeenCalledTimes(4)
    expect(next.mock.calls.every(([error]) => error === undefined)).toBe(true)
  })

  it.each([
    [{ username: 'x', email: 'bad', password: 'x' }],
    [{ email: 'viewer@example.com', password: 'x'.repeat(129) }],
    [{ title: 'x' }],
    [{ title: 'valid', initialVideoId: 'invalid' }],
  ])('rejects invalid request bodies', (body) => {
    const next = vi.fn()
    const handler = 'username' in body ? validateRegister : 'email' in body ? validateLogin : validateCreateRoom
    handler(request(body), {} as never, next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
  })

  it('rejects malformed room codes before database access', () => {
    const next = vi.fn()
    validateRoomCodeParam(request({}, { roomCode: 'DROP TABLE' }), {} as never, next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
  })
})
