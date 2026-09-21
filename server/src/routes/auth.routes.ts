import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
import { authRateLimiter } from '../middleware/rateLimit'
import {
  validateEmailOnly,
  validateForgotPassword,
  validateLogin,
  validateRegister,
  validateResetPassword,
  validateVerificationToken,
} from '../middleware/validateRequest'

const router = Router()

router.post('/register', authRateLimiter, validateRegister, (req, res, next) => authController.register(req, res, next))
router.post('/login', authRateLimiter, validateLogin, (req, res, next) => authController.login(req, res, next))
router.get('/verify-email', authRateLimiter, validateVerificationToken, (req, res, next) => authController.verifyEmail(req, res, next))
router.post('/resend-verification', authRateLimiter, validateEmailOnly, (req, res, next) => authController.resendVerification(req, res, next))
router.post('/forgot-password', authRateLimiter, validateForgotPassword, (req, res, next) => authController.forgotPassword(req, res, next))
router.post('/reset-password', authRateLimiter, validateResetPassword, (req, res, next) => authController.resetPassword(req, res, next))
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next))

export default router
