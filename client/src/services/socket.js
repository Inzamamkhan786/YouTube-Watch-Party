import { io } from 'socket.io-client'
import { API_BASE_URL } from '../utils/constants'

export function createRoomSocket(token) {
  return io(API_BASE_URL || undefined, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.25,
    timeout: 10000,
  })
}
