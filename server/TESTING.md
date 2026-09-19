# Testing Strategy

## Default suite

Run the deterministic suite with:

```text
npm test
```

The default Vitest suite does not require PostgreSQL, Redis, or a running HTTP server. Prisma, auth, playback, and authorization dependencies are mocked at their service boundaries. Socket handlers use fake sockets and fake room emitters so room isolation can be asserted directly.

## Coverage layers

- `auth.service.test.ts`: registration, bcrypt hashing, login, invalid credentials.
- `room.service.test.ts` and `roomMember.service.test.ts`: creation, host membership, joining, invalid rooms, duplicate membership.
- `roomRole.service.test.ts` and `RoleHandler.test.ts`: role transitions, host transfer, host-only enforcement, host removal protection.
- `playback.service.test.ts` and `PlaybackHandler.test.ts`: play, pause, seek, video changes, authoritative elapsed-time state, participant rejection.
- `actionRequest.service.test.ts`: participant requests, moderator/host approvals, rejection, unauthorized review, shared playback execution.
- `ChatHandler.test.ts`: authenticated messages, membership rejection, persistence/broadcast, room isolation, allowed reactions.
- `RoomSocketHandler.test.ts`: join, leave, state synchronization, member restoration.
- `SocketAuthentication.test.ts` and `jwt.test.ts`: invalid/expired tokens, fake user IDs, algorithm restrictions, reconnect re-authentication.
- `validateRequest.test.ts`: usernames, email, room codes, room input, and YouTube IDs.

## Integration tests

Tests that need real infrastructure should be kept separate from the default suite:

- PostgreSQL integration: run Prisma migrations against a disposable test database and exercise REST controllers/services together.
- Socket.IO integration: start the app and connect two or more `socket.io-client` instances to assert cross-room isolation and reconnect behavior.
- Redis integration: run two app instances against one Redis instance and assert events cross the instance boundary.

These tests should use isolated database schemas and disposable Redis namespaces. They should not replace the deterministic tests above.
