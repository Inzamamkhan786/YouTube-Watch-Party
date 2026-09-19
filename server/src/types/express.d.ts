export interface AuthenticatedUser {
  id: string
  email: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}
