import type { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'
import { sendCreated, sendSuccess, sendError } from '../utils/response'

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password } = req.body
      const result = await authService.register({ username, email, password })
      sendCreated(res, result, 'User registered successfully')
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body
      const result = await authService.login({ email, password })
      sendSuccess(res, result, 'Login successful')
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized', 401)
        return
      }

      const user = await authService.getCurrentUser(req.user.id)
      sendSuccess(res, { user }, 'Current user profile retrieved')
    } catch (err) {
      next(err)
    }
  }
}

export const authController = new AuthController()
