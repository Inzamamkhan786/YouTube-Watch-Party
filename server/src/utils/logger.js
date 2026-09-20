const { isDev } = require('../config/env')

const LEVEL_COLORS = {
  info:  '\x1b[36m',  // cyan
  warn:  '\x1b[33m',  // yellow
  error: '\x1b[31m',  // red
  debug: '\x1b[90m',  // gray
}
const RESET = '\x1b[0m'
const DIM   = '\x1b[90m'

function timestamp() {
  return new Date().toISOString()
}

function write(level, message, meta) {
  if (level === 'debug' && !isDev) return

  const color  = LEVEL_COLORS[level]
  const prefix = `${color}[${level.toUpperCase().padEnd(5)}]${RESET}`
  const ts     = `${DIM}${timestamp()}${RESET}`
  const line   = `${ts} ${prefix} ${message}`

  const metaStr =
    meta === undefined
      ? ''
      : typeof meta === 'object'
      ? '\n' + JSON.stringify(meta, null, 2)
      : ' ' + String(meta)

  const out = line + metaStr

  if (level === 'error') console.error(out)
  else if (level === 'warn') console.warn(out)
  else console.log(out)
}

/**
 * Lightweight structured logger.
 * In production, debug logs are suppressed automatically.
 */
const logger = {
  info:  (msg, meta) => write('info',  msg, meta),
  warn:  (msg, meta) => write('warn',  msg, meta),
  error: (msg, meta) => write('error', msg, meta),
  debug: (msg, meta) => write('debug', msg, meta),
}

module.exports = { logger }
