/** Application name */
export const APP_NAME = 'SyncTube'

/** API base URL — falls back to empty string so Vite proxy handles /api/* in dev */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

/** Client-side route constants */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  ROOMS_CREATE: '/create-room',
  ROOMS_JOIN: '/join',
  ROOM: '/room/:roomCode',
}
