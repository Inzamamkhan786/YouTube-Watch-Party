const jwt = require('jsonwebtoken')
const { env } = require('../config/env')

/**
 * Signs a JWT token containing the user ID.
 */
function signToken(payload) {
  const options = {
    expiresIn: env.JWT_EXPIRES_IN,
  }
  return jwt.sign(payload, env.JWT_SECRET, { ...options, algorithm: 'HS256' })
}

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws JsonWebTokenError / TokenExpiredError if invalid or expired.
 */
function verifyToken(token) {
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

module.exports = { signToken, verifyToken }
