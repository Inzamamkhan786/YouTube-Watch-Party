const dotenv = require('dotenv')
const path = require('path')

// Load .env from the server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function optional(key, fallback) {
  return process.env[key] ?? fallback
}

function required(key, devFallback) {
  const val = process.env[key] ?? (process.env.NODE_ENV === 'development' ? devFallback : undefined)
  if (!val) {
    throw new Error(`[Config] Missing required environment variable: ${key}`)
  }
  return val
}

/**
 * Validated environment configuration.
 */
const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '4000'), 10),
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:5173'),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:5173'),
  REDIS_URL: optional('REDIS_URL', ''),
  DATABASE_URL: required(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/synctube?schema=public'
  ),

  // Module 2 — Auth
  JWT_SECRET: required(
    'JWT_SECRET',
    'synctube-super-secret-jwt-key-for-development-mode-only'
  ),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  BCRYPT_ROUNDS: parseInt(optional('BCRYPT_ROUNDS', '10'), 10),

  // Email / SMTP
  SMTP_HOST: optional('SMTP_HOST', ''),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587'), 10),
  SMTP_SECURE: optional('SMTP_SECURE', 'false').toLowerCase() === 'true',
  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASSWORD: optional('SMTP_PASSWORD', ''),
  SMTP_FROM: optional('SMTP_FROM', 'no-reply@synctube.local'),
}

if (!Number.isInteger(env.BCRYPT_ROUNDS) || env.BCRYPT_ROUNDS < 10 || env.BCRYPT_ROUNDS > 15) {
  throw new Error('[Config] BCRYPT_ROUNDS must be an integer between 10 and 15')
}

const isDev = env.NODE_ENV === 'development'
const isProd = env.NODE_ENV === 'production'

module.exports = { env, isDev, isProd }
