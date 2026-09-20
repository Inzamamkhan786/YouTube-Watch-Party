const crypto = require('crypto')

// Non-ambiguous uppercase alphanumeric characters (excludes 0, O, 1, I)
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const CODE_LENGTH = 6

/**
 * Generates a short, unique, URL-safe room code.
 * Example output: "W7X9KP"
 */
function generateRoomCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return code
}

module.exports = { generateRoomCode }
