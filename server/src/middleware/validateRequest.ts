import type { Request, RequestHandler } from 'express'
import { AppError } from './errorHandler'

const ROOM_CODE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME = /^[a-zA-Z0-9_-]{3,30}$/

export const validateRegister: RequestHandler = (req, _res, next) => {
  const { username, email, password } = req.body ?? {}
  if (
    typeof username !== 'string' ||
    !USERNAME.test(username.trim()) ||
    typeof email !== 'string' ||
    !EMAIL.test(email.trim()) ||
    typeof password !== 'string' ||
    password.length < 6 ||
    password.length > 128
  ) {
    next(new AppError(400, 'Invalid registration details'))
    return
  }
  next()
}

export const validateLogin: RequestHandler = (req, _res, next) => {
  const { email, password } = req.body ?? {}
  if (
    typeof email !== 'string' ||
    !EMAIL.test(email.trim()) ||
    typeof password !== 'string' ||
    password.length === 0 ||
    password.length > 128
  ) {
    next(new AppError(400, 'Invalid login details'))
    return
  }
  next()
}

export const validateRoomCodeParam: RequestHandler = (req, _res, next) => {
  if (typeof req.params.roomCode !== 'string' || !ROOM_CODE.test(req.params.roomCode.toUpperCase())) {
    next(new AppError(400, 'Invalid room code'))
    return
  }
  next()
}

export const validateRoomIdParam: RequestHandler = (req, _res, next) => {
  if (typeof req.params.roomId !== 'string' || !UUID.test(req.params.roomId)) {
    next(new AppError(400, 'Invalid room ID'))
    return
  }
  next()
}

export const validateCreateRoom: RequestHandler = (req, _res, next) => {
  const body = req.body ?? {}
  const validVideo = typeof body.initialVideoId === 'string' && VIDEO_ID.test(body.initialVideoId.trim())
  const validMaxMembers = body.maxMembers === undefined || (
    Number.isInteger(body.maxMembers) && body.maxMembers >= 1 && body.maxMembers <= 1000
  )
  if (
    typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.trim().length > 120 ||
    (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 1000)) ||
    (body.isPrivate !== undefined && typeof body.isPrivate !== 'boolean') ||
    (body.passcode !== undefined && (typeof body.passcode !== 'string' || body.passcode.length > 128)) ||
    !validVideo ||
    !validMaxMembers
  ) {
    next(new AppError(400, 'Initial YouTube video is required when creating a room'))
    return
  }
  next()
}

export const validateJoinBody: RequestHandler = (req, _res, next) => {
  if (req.body?.passcode !== undefined && typeof req.body.passcode !== 'string') {
    next(new AppError(400, 'Invalid passcode'))
    return
  }
  next()
}

export function validateBodyObject(req: Request): void {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError(400, 'Request body must be a JSON object')
  }
}
