import { Router } from 'express'
import { roomController } from '../controllers/room.controller'
import { authenticate } from '../middleware/authenticate'
import {
	validateCreateRoom,
	validateJoinBody,
	validateRoomCodeParam,
	validateRoomIdParam,
} from '../middleware/validateRequest'

const router = Router()

// All room operations require authentication
router.post('/', authenticate, validateCreateRoom, (req, res, next) => roomController.createRoom(req, res, next))
router.get('/:roomCode', authenticate, validateRoomCodeParam, (req, res, next) => roomController.getRoom(req, res, next))
router.post('/:roomCode/join', authenticate, validateRoomCodeParam, validateJoinBody, (req, res, next) => roomController.joinRoom(req, res, next))
router.get('/:roomId/members', authenticate, validateRoomIdParam, (req, res, next) => roomController.getRoomMembers(req, res, next))

export default router
