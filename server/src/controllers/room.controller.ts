import type { Request, Response, NextFunction } from 'express'
import { roomService } from '../services/room.service'
import { roomMemberService } from '../services/roomMember.service'
import { sendCreated, sendSuccess, sendError } from '../utils/response'

export class RoomController {
  /**
   * POST /api/rooms
   * Creates a new room. Authenticated user becomes HOST.
   */
  async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized', 401)
        return
      }

      const { title, description, isPrivate, passcode, maxMembers, initialVideoId } = req.body
      const room = await roomService.createRoom(req.user.id, {
        title,
        description,
        isPrivate,
        passcode,
        maxMembers,
        initialVideoId,
      })

      sendCreated(res, { room }, 'Room created successfully')
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/rooms/:roomCode
   * Retrieves room information by unique roomCode.
   */
  async getRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomCode } = req.params
      const userId = req.user?.id

      const room = await roomService.getRoomByCode(roomCode, userId)
      sendSuccess(res, { room }, 'Room retrieved successfully')
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/rooms/:roomCode/join
   * Joins a room using the roomCode (or room link). Default role is PARTICIPANT.
   */
  async joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized', 401)
        return
      }

      const { roomCode } = req.params
      const { passcode } = req.body

      const result = await roomMemberService.joinRoom(req.user.id, roomCode, passcode)
      sendSuccess(res, result, 'Joined room successfully')
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/rooms/:roomId/members
   * Returns list of room members. Requires the requester to be a member of the room.
   */
  async getRoomMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized', 401)
        return
      }

      const { roomId } = req.params
      const members = await roomMemberService.getRoomMembers(roomId, req.user.id)
      sendSuccess(res, { members }, 'Room members retrieved successfully')
    } catch (err) {
      next(err)
    }
  }
}

export const roomController = new RoomController()
