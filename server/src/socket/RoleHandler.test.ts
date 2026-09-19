import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomRole } from '@prisma/client'
import { member, room } from '../test-fixtures'

const authMock = vi.hoisted(() => ({ requireRole: vi.fn() }))
const roleMock = vi.hoisted(() => ({ assignRole: vi.fn(), removeParticipant: vi.fn(), transferHost: vi.fn() }))
vi.mock('../services/roomAuth.service', () => ({ roomAuthorizationService: authMock }))
vi.mock('../services/roomRole.service', () => ({ roomRoleService: roleMock }))

import { RoleHandler } from './RoleHandler'

function socket() {
  const handlers = new Map<string, (...args: any[]) => void>()
  return {
    data: { user: { userId: member().userId, username: 'viewer' }, joinedRooms: new Map([[room().id, room().roomCode]]) },
    on: vi.fn((event: string, handler: (...args: any[]) => void) => handlers.set(event, handler)),
    emit: vi.fn(),
    handlers,
  }
}

describe('RoleHandler authorization boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.requireRole.mockResolvedValue(member({ role: RoomRole.HOST }))
    roleMock.assignRole.mockResolvedValue([])
    roleMock.removeParticipant.mockResolvedValue({ member: member(), members: [] })
    roleMock.transferHost.mockResolvedValue([])
  })

  it.each(['assign_role', 'remove_participant', 'transfer_host'] as const)('rejects participant %s', async (event) => {
    const client = socket()
    authMock.requireRole.mockRejectedValue(new Error('host required'))
    new RoleHandler({ to: vi.fn(), sockets: { sockets: new Map() } } as never).register(client as never)
    const ack = vi.fn()
    const payload = event === 'assign_role'
      ? { roomCode: room().roomCode, targetUserId: '44444444-4444-4444-8444-444444444444', role: RoomRole.MODERATOR }
      : { roomCode: room().roomCode, targetUserId: '44444444-4444-4444-8444-444444444444' }
    client.handlers.get(event)?.(payload, ack)
    await vi.waitFor(() => expect(ack).toHaveBeenCalledWith({ ok: false, error: 'host required' }))
    expect(roleMock.assignRole).not.toHaveBeenCalled()
    expect(roleMock.removeParticipant).not.toHaveBeenCalled()
    expect(roleMock.transferHost).not.toHaveBeenCalled()
  })
})
