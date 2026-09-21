import type { RoomMember, User } from '@prisma/client'

export const user = (overrides: Partial<User> = {}): User => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'viewer@example.com',
  username: 'viewer',
  passwordHash: '',
  displayName: 'Viewer',
  avatarUrl: null,
  isActive: true,
  emailVerified: false,
  emailVerifiedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})

export const member = (overrides: Partial<RoomMember> = {}): RoomMember => ({
  id: '22222222-2222-4222-8222-222222222222',
  roomId: '33333333-3333-4333-8333-333333333333',
  userId: user().id,
  role: 'PARTICIPANT',
  isMuted: false,
  isBanned: false,
  joinedAt: new Date('2026-01-01T00:00:00.000Z'),
  lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})

export const room = (overrides: Record<string, unknown> = {}) => ({
  id: '33333333-3333-4333-8333-333333333333',
  roomCode: 'ABC234',
  title: 'Test Room',
  description: null,
  isPrivate: false,
  passcode: null,
  maxMembers: 50,
  hostId: '11111111-1111-4111-8111-111111111111',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  currentVideoId: 'dQw4w9WgXcQ',
  isPlaying: false,
  currentTime: 10,
  stateUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})
