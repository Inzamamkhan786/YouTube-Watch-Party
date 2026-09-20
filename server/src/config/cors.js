const { env, isDev } = require('./env')

/**
 * CORS configuration.
 * Allows only the configured CLIENT_URL origin.
 * In dev, also allows requests with no origin (curl, REST clients).
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [env.CLIENT_URL]
    // Originless requests are useful for local CLI checks, but are not accepted in production.
    if ((isDev && !origin) || (origin && allowed.includes(origin))) {
      callback(null, true)
    } else {
      const error = new Error('Origin is not allowed by CORS')
      error.status = 403
      callback(error)
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86_400, // Preflight cached for 24 h
}

module.exports = { corsOptions }
