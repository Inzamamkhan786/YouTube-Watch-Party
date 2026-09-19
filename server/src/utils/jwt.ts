import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'

export interface JwtUserPayload {
  userId: string
}

/**
 * Signs a JWT token containing the user ID.
 */
export function signToken(payload: JwtUserPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  }
  return jwt.sign(payload, env.JWT_SECRET, { ...options, algorithm: 'HS256' })
}

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws JsonWebTokenError / TokenExpiredError if invalid or expired.
 */
export function verifyToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof decoded.userId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded.userId)
  ) {
    throw new jwt.JsonWebTokenError('Invalid token claims')
  }
  return { userId: decoded.userId }
}
