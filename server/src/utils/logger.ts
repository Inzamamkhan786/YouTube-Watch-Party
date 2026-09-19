import { isDev } from '../config/env'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const LEVEL_COLORS: Record<LogLevel, string> = {
  info:  '\x1b[36m',  // cyan
  warn:  '\x1b[33m',  // yellow
  error: '\x1b[31m',  // red
  debug: '\x1b[90m',  // gray
}
const RESET = '\x1b[0m'
const DIM   = '\x1b[90m'

function timestamp(): string {
  return new Date().toISOString()
}

function write(level: LogLevel, message: string, meta?: unknown): void {
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
export const logger = {
  info:  (msg: string, meta?: unknown) => write('info',  msg, meta),
  warn:  (msg: string, meta?: unknown) => write('warn',  msg, meta),
  error: (msg: string, meta?: unknown) => write('error', msg, meta),
  debug: (msg: string, meta?: unknown) => write('debug', msg, meta),
}
