import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { signToken, verifyToken } from './jwt'

describe('JWT security', () => {
  const userId = '11111111-1111-4111-8111-111111111111'

  it('accepts a valid token and rejects tampering', () => {
    const token = signToken({ userId })
    expect(verifyToken(token)).toEqual({ userId })
    expect(() => verifyToken(`${token}tampered`)).toThrow()
  })

  it('rejects expired tokens', () => {
    const token = jwt.sign({ userId }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: -1 })
    expect(() => verifyToken(token)).toThrow(/expired/i)
  })

  it('rejects fake user IDs and non-HS256 algorithms', () => {
    const fakeId = jwt.sign({ userId: 'attacker' }, env.JWT_SECRET, { algorithm: 'HS256' })
    const wrongAlgorithm = jwt.sign({ userId }, env.JWT_SECRET, { algorithm: 'HS384' })
    expect(() => verifyToken(fakeId)).toThrow()
    expect(() => verifyToken(wrongAlgorithm)).toThrow()
  })
})
