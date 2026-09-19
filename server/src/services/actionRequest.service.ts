import {
  ActionStatus,
  Prisma,
  RequestType,
  RoomRole,
  type ActionRequest,
} from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { roomAuthorizationService } from './roomAuth.service'
import { playbackService, type PlaybackAction, type PlaybackState } from './playback.service'

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export interface ActionRequestPayload {
  currentTime?: number
  videoId?: string
}

export interface ActionRequestView {
  id: string
  roomId: string
  userId: string
  username: string
  requestType: RequestType
  payload: Prisma.JsonValue | null
  status: ActionStatus
  reviewedById: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface ApprovedRequest {
  request: ActionRequestView
  state: PlaybackState
}

export class ActionRequestService {
  async createRequest(
    roomId: string,
    userId: string,
    requestType: RequestType,
    payload: Prisma.JsonValue | null
  ): Promise<ActionRequestView> {
    const member = await roomAuthorizationService.requireMembership(roomId, userId)
    if (member.role !== RoomRole.PARTICIPANT) {
      throw new AppError(400, 'Hosts and moderators can control playback directly')
    }

    const action = this.toPlaybackAction(requestType, payload)
    const request = await prisma.actionRequest.create({
      data: {
        roomId,
        userId,
        requestType,
        payload: action.type === 'change_video'
          ? { videoId: action.videoId }
          : 'currentTime' in action && action.currentTime !== undefined
            ? { currentTime: action.currentTime }
            : Prisma.JsonNull,
      },
      include: {
        user: { select: { username: true } },
      },
    })

    return this.toView(request)
  }

  async getPendingRequests(roomId: string, reviewerId: string): Promise<ActionRequestView[]> {
    await roomAuthorizationService.requireRole(
      roomId,
      reviewerId,
      [RoomRole.HOST, RoomRole.MODERATOR]
    )

    const requests = await prisma.actionRequest.findMany({
      where: { roomId, status: ActionStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { username: true } } },
    })
    return requests.map((request) => this.toView(request))
  }

  async approveRequest(
    roomId: string,
    requestId: string,
    reviewerId: string
  ): Promise<ApprovedRequest> {
    await roomAuthorizationService.requireRole(
      roomId,
      reviewerId,
      [RoomRole.HOST, RoomRole.MODERATOR]
    )

    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "action_requests"
        WHERE "id" = ${requestId} AND "roomId" = ${roomId}
        FOR UPDATE
      `
      const request = await tx.actionRequest.findUnique({
        where: { id: requestId },
        include: { user: { select: { username: true } } },
      })
      if (!request || request.roomId !== roomId) {
        throw new AppError(404, 'Action request not found')
      }
      if (request.status !== ActionStatus.PENDING) {
        throw new AppError(409, 'Action request has already been reviewed')
      }

      const action = this.toPlaybackAction(request.requestType, request.payload)
      const state = await playbackService.update(roomId, action, tx)
      const reviewed = await tx.actionRequest.update({
        where: { id: request.id },
        data: {
          status: ActionStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
        include: { user: { select: { username: true } } },
      })

      return { request: this.toView(reviewed), state }
    })
  }

  async rejectRequest(
    roomId: string,
    requestId: string,
    reviewerId: string
  ): Promise<ActionRequestView> {
    await roomAuthorizationService.requireRole(
      roomId,
      reviewerId,
      [RoomRole.HOST, RoomRole.MODERATOR]
    )

    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "action_requests"
        WHERE "id" = ${requestId} AND "roomId" = ${roomId}
        FOR UPDATE
      `
      const request = await tx.actionRequest.findUnique({
        where: { id: requestId },
        include: { user: { select: { username: true } } },
      })
      if (!request || request.roomId !== roomId) {
        throw new AppError(404, 'Action request not found')
      }
      if (request.status !== ActionStatus.PENDING) {
        throw new AppError(409, 'Action request has already been reviewed')
      }

      const reviewed = await tx.actionRequest.update({
        where: { id: request.id },
        data: {
          status: ActionStatus.REJECTED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
        include: { user: { select: { username: true } } },
      })
      return this.toView(reviewed)
    })
  }

  private toPlaybackAction(
    requestType: RequestType,
    payload: Prisma.JsonValue | null
  ): PlaybackAction {
    const values = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {}
    const currentTime = values.currentTime

    if (
      currentTime !== undefined &&
      (typeof currentTime !== 'number' || !Number.isFinite(currentTime) || currentTime < 0)
    ) {
      throw new AppError(400, 'Playback time must be a non-negative number')
    }

    if (requestType === RequestType.REQUEST_SEEK && currentTime === undefined) {
      throw new AppError(400, 'Seek requests require a playback time')
    }
    if (requestType === RequestType.REQUEST_CHANGE_VIDEO) {
      const videoId = values.videoId
      if (typeof videoId !== 'string' || !YOUTUBE_VIDEO_ID.test(videoId)) {
        throw new AppError(400, 'Invalid YouTube video ID')
      }
      return { type: 'change_video', videoId }
    }

    if (requestType === RequestType.REQUEST_PLAY) return { type: 'play', currentTime: currentTime as number | undefined }
    if (requestType === RequestType.REQUEST_PAUSE) return { type: 'pause', currentTime: currentTime as number | undefined }
    if (requestType === RequestType.REQUEST_SEEK) return { type: 'seek', currentTime: currentTime as number }
    throw new AppError(400, 'Unsupported action request type')
  }

  private toView(
    request: ActionRequest & { user: { username: string } }
  ): ActionRequestView {
    return {
      id: request.id,
      roomId: request.roomId,
      userId: request.userId,
      username: request.user.username,
      requestType: request.requestType,
      payload: request.payload,
      status: request.status,
      reviewedById: request.reviewedById,
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
    }
  }
}

export const actionRequestService = new ActionRequestService()
