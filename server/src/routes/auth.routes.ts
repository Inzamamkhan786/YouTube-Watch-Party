import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
import { authRateLimiter } from '../middleware/rateLimit'
import { validateLogin, validateRegister } from '../middleware/validateRequest'

const router = Router()

router.post('/register', authRateLimiter, validateRegister, (req, res, next) => authController.register(req, res, next))
router.post('/login', authRateLimiter, validateLogin, (req, res, next) => authController.login(req, res, next))
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next))

export default router
