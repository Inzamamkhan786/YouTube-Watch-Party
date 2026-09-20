/** Application name */
export const APP_NAME = 'SyncTube'

/** API base URL — falls back to empty string so Vite proxy handles /api/* in dev */
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

/** Client-side route constants — add new routes here as modules are implemented */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ROOMS_CREATE: '/create-room',
  ROOMS_JOIN: '/join',
  ROOM: '/room/:roomCode',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
