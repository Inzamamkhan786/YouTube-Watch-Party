import { beforeEach, describe, expect, it, vi } from 'vitest'
import { member, room } from '../test-fixtures'

const prismaMock = vi.hoisted(() => ({
  room: { findUnique: vi.fn() },
  roomMember: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}))
const roomServiceMock = vi.hoisted(() => ({ getRoomByCode: vi.fn() }))

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('./room.service', () => ({ roomService: roomServiceMock }))

import { RoomMemberService } from './roomMember.service'

describe('RoomMemberService', () => {
  const service = new RoomMemberService()

  beforeEach(() => vi.resetAllMocks())

  it('joins a valid room as PARTICIPANT', async () => {
    const targetRoom = { ...room(), _count: { members: 1 } }
    const createdMember = member({ userId: '44444444-4444-4444-8444-444444444444' })
    prismaMock.room.findUnique.mockResolvedValue(targetRoom)
    prismaMock.roomMember.findUnique.mockResolvedValue(null)
    prismaMock.roomMember.create.mockResolvedValue(createdMember)
    roomServiceMock.getRoomByCode.mockResolvedValue({ id: targetRoom.id, roomCode: targetRoom.roomCode })

    const result = await service.joinRoom(createdMember.userId, targetRoom.roomCode)

    expect(prismaMock.roomMember.create).toHaveBeenCalledWith({
      data: { roomId: targetRoom.id, userId: createdMember.userId, role: 'PARTICIPANT' },
    })
    expect(result.member.role).toBe('PARTICIPANT')
  })

  it('is idempotent for duplicate membership', async () => {
    const existing = member()
    prismaMock.room.findUnique.mockResolvedValue({ ...room(), _count: { members: 1 } })
    prismaMock.roomMember.findUnique.mockResolvedValue(existing)
    prismaMock.roomMember.update.mockResolvedValue(existing)
    roomServiceMock.getRoomByCode.mockResolvedValue({ id: existing.roomId })

    const result = await service.joinRoom(existing.userId, room().roomCode)

    expect(prismaMock.roomMember.create).not.toHaveBeenCalled()
    expect(result.member).toBe(existing)
  })

  it('rejects an invalid room code', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)
    await expect(service.joinRoom(member().userId, 'MISSING')).rejects.toMatchObject({ statusCode: 404 })
  })
})
