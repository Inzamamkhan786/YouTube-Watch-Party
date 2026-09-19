import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionStatus, RequestType, RoomRole } from '@prisma/client'
import { member } from '../test-fixtures'

const prismaMock = vi.hoisted(() => ({
  actionRequest: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}))
const authMock = vi.hoisted(() => ({ requireMembership: vi.fn(), requireRole: vi.fn() }))
const playbackMock = vi.hoisted(() => ({ update: vi.fn() }))

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('./roomAuth.service', () => ({ roomAuthorizationService: authMock }))
vi.mock('./playback.service', () => ({ playbackService: playbackMock }))

import { ActionRequestService } from './actionRequest.service'

describe('ActionRequestService', () => {
  const service = new ActionRequestService()
  const roomId = member().roomId
  const participantId = member().userId
  const reviewerId = '44444444-4444-4444-8444-444444444444'

  beforeEach(() => vi.resetAllMocks())

  it('allows a participant to create a validated playback request', async () => {
    authMock.requireMembership.mockResolvedValue(member({ role: RoomRole.PARTICIPANT }))
    prismaMock.actionRequest.create.mockResolvedValue({
      id: 'request-1', roomId, userId: participantId,
      requestType: RequestType.REQUEST_SEEK, payload: { currentTime: 20 },
      status: ActionStatus.PENDING, reviewedById: null, reviewedAt: null,
      createdAt: new Date(), updatedAt: new Date(), user: { username: 'viewer' },
    })

    const result = await service.createRequest(
      roomId, participantId, RequestType.REQUEST_SEEK, { currentTime: 20 }
    )

    expect(result.status).toBe(ActionStatus.PENDING)
    expect(prismaMock.actionRequest.create).toHaveBeenCalled()
  })

  it('rejects request creation by a moderator because they can control directly', async () => {
    authMock.requireMembership.mockResolvedValue(member({ role: RoomRole.MODERATOR }))
    await expect(service.createRequest(roomId, participantId, RequestType.REQUEST_PLAY, null))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it.each([RoomRole.MODERATOR, RoomRole.HOST])('allows %s to approve through PlaybackService', async (reviewerRole) => {
    authMock.requireRole.mockResolvedValue(member({ userId: reviewerId, role: reviewerRole }))
    const request = {
      id: 'request-1', roomId, userId: participantId,
      requestType: RequestType.REQUEST_PLAY, payload: null,
      status: ActionStatus.PENDING, reviewedById: null, reviewedAt: null,
      createdAt: new Date(), updatedAt: new Date(), user: { username: 'viewer' },
    }
    const reviewed = { ...request, status: ActionStatus.APPROVED, reviewedById: reviewerId, reviewedAt: new Date() }
    const tx = {
      $queryRaw: vi.fn(),
      actionRequest: { findUnique: vi.fn().mockResolvedValue(request), update: vi.fn().mockResolvedValue(reviewed) },
    }
    prismaMock.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
    playbackMock.update.mockResolvedValue({ roomId, roomCode: 'ABC234', videoId: 'dQw4w9WgXcQ', isPlaying: true, currentTime: 0, stateUpdatedAt: new Date().toISOString() })

    const result = await service.approveRequest(roomId, request.id, reviewerId)

    expect(playbackMock.update).toHaveBeenCalledWith(roomId, { type: 'play' }, tx)
    expect(result.request.status).toBe(ActionStatus.APPROVED)
  })

  it('rejects requests and prevents unauthorized reviewers', async () => {
    authMock.requireRole.mockRejectedValue(new Error('Forbidden'))
    await expect(service.rejectRequest(roomId, 'request-1', participantId)).rejects.toThrow('Forbidden')

    authMock.requireRole.mockResolvedValue(member({ role: RoomRole.HOST }))
    const pending = {
      id: 'request-1', roomId, userId: participantId,
      requestType: RequestType.REQUEST_PAUSE, payload: null,
      status: ActionStatus.PENDING, reviewedById: null, reviewedAt: null,
      createdAt: new Date(), updatedAt: new Date(), user: { username: 'viewer' },
    }
    const tx = {
      $queryRaw: vi.fn(),
      actionRequest: { findUnique: vi.fn().mockResolvedValue(pending), update: vi.fn().mockResolvedValue({ ...pending, status: ActionStatus.REJECTED }) },
    }
    prismaMock.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
    await expect(service.rejectRequest(roomId, pending.id, reviewerId)).resolves.toMatchObject({ status: ActionStatus.REJECTED })
  })
})
