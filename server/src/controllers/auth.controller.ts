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
      sendCreated(res, result, result.message)
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
   * GET or POST /api/auth/verify-email
   * POST /api/auth/verify-otp
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokenOrOtp =
        (typeof req.body?.otp === 'string' && req.body.otp.trim()) ||
        (typeof req.body?.token === 'string' && req.body.token.trim()) ||
        (typeof req.query?.otp === 'string' && req.query.otp.trim()) ||
        (typeof req.query?.token === 'string' && req.query.token.trim()) ||
        ''
      const email =
        (typeof req.body?.email === 'string' && req.body.email.trim()) ||
        (typeof req.query?.email === 'string' && req.query.email.trim()) ||
        undefined

      const result = await authService.verifyEmail({ tokenOrOtp, email })
      sendSuccess(res, result, result.message)
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/auth/resend-verification
   */
  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body
      const result = await authService.resendVerification(email)
      sendSuccess(res, result, result.message)
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body
      const result = await authService.forgotPassword(email)
      sendSuccess(res, result, result.message)
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body
      const result = await authService.resetPassword({ token, password })
      sendSuccess(res, result, result.message)
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
