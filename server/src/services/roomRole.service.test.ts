import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomRole } from '@prisma/client'
import { member } from '../test-fixtures'

const prismaMock = vi.hoisted(() => ({
  roomMember: { update: vi.fn() },
  $transaction: vi.fn(),
}))
const memberServiceMock = vi.hoisted(() => ({
  getActiveMember: vi.fn(),
  getActiveMembers: vi.fn(),
}))

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('./roomMember.service', () => ({ roomMemberService: memberServiceMock }))

import { RoomRoleService } from './roomRole.service'

describe('RoomRoleService', () => {
  const service = new RoomRoleService()

  beforeEach(() => vi.resetAllMocks())

  it('assigns moderator and returns the refreshed membership list', async () => {
    const target = member({ userId: '44444444-4444-4444-8444-444444444444' })
    const members = [{ id: target.id, role: RoomRole.MODERATOR }]
    memberServiceMock.getActiveMember.mockResolvedValue(target)
    memberServiceMock.getActiveMembers.mockResolvedValue(members)

    await expect(service.assignRole(target.roomId, target.userId, RoomRole.MODERATOR))
      .resolves.toEqual(members)
    expect(prismaMock.roomMember.update).toHaveBeenCalledWith({
      where: { id: target.id },
      data: { role: RoomRole.MODERATOR },
    })
  })

  it('does not allow assigning HOST through assign_role', async () => {
    await expect(service.assignRole(member().roomId, member().userId, RoomRole.HOST))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('cannot remove the host', async () => {
    const host = member({ role: RoomRole.HOST })
    memberServiceMock.getActiveMember.mockResolvedValue(host)

    await expect(service.removeParticipant(host.roomId, host.userId))
      .rejects.toMatchObject({ statusCode: 400 })
    expect(prismaMock.roomMember.update).not.toHaveBeenCalled()
  })

  it('transfers host ownership transactionally and preserves a host', async () => {
    const tx = {
      roomMember: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(member({ role: RoomRole.HOST }))
          .mockResolvedValueOnce(member({ userId: '44444444-4444-4444-8444-444444444444' })),
        update: vi.fn().mockResolvedValue(undefined),
      },
    }
    prismaMock.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
    memberServiceMock.getActiveMembers.mockResolvedValue([{ role: RoomRole.HOST }])

    await service.transferHost(
      member().roomId,
      member().userId,
      '44444444-4444-4444-8444-444444444444'
    )

    expect(tx.roomMember.update).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: { role: RoomRole.PARTICIPANT },
    }))
    expect(tx.roomMember.update).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: { role: RoomRole.HOST },
    }))
  })
})
