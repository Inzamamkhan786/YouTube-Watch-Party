# 🎬 SyncTube


SyncTube is a real-time collaborative web application where multiple users join a shared room and watch YouTube videos together, perfectly in sync. Playback (play, pause, seek, change video) is controlled through a **role-based access control (RBAC)** system and validated by an **authoritative backend**. The app also includes chat, emoji reactions, participant action-approval requests, persistent rooms, and a Redis-ready horizontally scalable WebSocket layer.

- 🌐 **Live Link:** [SyncTube](https://you-tube-watch-party-theta.vercel.app/)
- 🎥 **Demo Video:** [Watch the SyncTube Demo](https://drive.google.com/file/d/1GPvfMgj98dacDt61nymFQ-4STLCBu7Gf/view?usp=drivesdk)
- ⚙️ **Backend Health Check:** `https://<your-backend>.onrender.com/health`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Database Architecture](#7-database-architecture)
8. [Socket.IO Architecture](#8-socketio-architecture)
9. [Real-Time Synchronization Flow](#9-real-time-synchronization-flow)
10. [RBAC Explanation](#10-rbac-explanation)
11. [Participant Request Workflow](#11-participant-request-workflow)
12. [Chat Architecture](#12-chat-architecture)
13. [Reaction Architecture](#13-reaction-architecture)
14. [Redis Scalability Architecture](#14-redis-scalability-architecture)
15. [Authentication Flow](#15-authentication-flow)
16. [Local Setup](#16-local-setup)
17. [Environment Variables](#17-environment-variables)
18. [Database Migration](#18-database-migration)
19. [Development Commands](#19-development-commands)
20. [Production Deployment](#20-production-deployment)
21. [Live URL](#21-live-url)
22. [API Documentation](#22-api-documentation)
23. [Socket Event Documentation](#23-socket-event-documentation)
24. [Security Considerations](#24-security-considerations)
25. [Design Decisions](#25-design-decisions)
26. [Trade-offs](#26-trade-offs)
27. [Known Limitations](#27-known-limitations)
28. [Future Improvements](#28-future-improvements)

---

## 1. Project Overview

SyncTube lets a group of users watch the same YouTube video at the same time, no matter where they are.

- A user registers, logs in, and creates a **room**. The creator automatically becomes the **Host**.
- Others join using a short **room code** or a shareable **room link** and become **Participants**.
- The Host can promote Participants to **Moderators**, remove participants, or transfer host ownership.
- Hosts and Moderators control playback. Participants can *request* playback actions, which a Host or Moderator approves or rejects.
- Everyone in the room can chat and send emoji reactions in real time.

The central design principle of the project:

> **The backend is authoritative for room state and permissions. The frontend is never trusted for authorization.**

Clients never change the room state directly. They send *intents* (for example "play"). The server authenticates the sender, checks their role in the database, updates the canonical room state, and only then broadcasts the result to everyone in the room.

---

## 2. Features

### Core
- Create a room, join via room code or link
- Three roles: **Host**, **Moderator**, **Participant**
- Real-time synchronized **play / pause / seek / change video**
- Server-side permission validation for every privileged event
- Role management (assign / demote), remove participant, transfer host
- Live participant list with role badges
- WebSocket (Socket.IO) real-time communication
- YouTube IFrame Player API integration (supports standard URLs, `youtu.be` links, Shorts, embed links, and raw 11-character video IDs)

### Extended
- JWT authentication (register / login / session persistence)
- Persistent rooms and room state (PostgreSQL)
- Participant **action requests** with Host/Moderator approval
- Real-time **text chat** with persisted history and moderation (delete)
- Real-time **emoji reactions**, stamped with the video timestamp
- **Reconnection and state recovery** with a connection status indicator
- OOP Socket.IO server architecture (handler classes per concern)
- **Redis adapter** support for horizontal scaling across multiple server instances
- Security hardening: rate limiting, Helmet, CORS, and input validation

---

## 3. Architecture

### 3.1 High-Level System Diagram

```
                    ┌──────────────────────────┐
                    │       React + Vite       │
                    │   TypeScript + Tailwind  │
                    │  YouTube IFrame Player   │
                    └────────────┬─────────────┘
                                 │
                 REST (HTTPS)    │    Socket.IO (WSS)
                                 │
                ┌────────────────▼────────────────┐
                │          Node.js Server         │
                │            Express              │
                │                                 │
                │  Auth │ Rooms │ RBAC │ Requests │
                │  Chat │ Reactions │ Playback    │
                │                                 │
                │         Socket.IO Server        │
                └───────────────┬─────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        PostgreSQL           Redis         YouTube IFrame
     (source of truth)   (Socket.IO       Player API
                           adapter)        (in browser)
```

### 3.2 Authoritative Server Model

Clients never mutate room state. Every privileged action goes through the server:

```
Client
   │  "play"
   ▼
Socket.IO Server
   ├── 1. Authenticate socket (JWT)
   ├── 2. Find the room
   ├── 3. Load the user's role from the DATABASE
   ├── 4. Validate the request
   ├── 5. Update the authoritative room state
   │
   ▼
Broadcast to room
   ├── User A
   ├── User B
   ├── User C
   └── User D
```

Example outcomes:

```
Participant → play → server rejects → permission_denied (to sender only)
Moderator   → play → server accepts → state updated → "play" broadcast to room
```

### 3.3 Multi-Server Scaling Diagram

```
                Client
                  │
            Load Balancer
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   ┌──────────┐        ┌──────────┐
   │ Server 1 │        │ Server 2 │
   └────┬─────┘        └────┬─────┘
        │                   │
        └────────┬──────────┘
                 ▼
               Redis
      (Socket.IO Redis Adapter,
       Pub/Sub across instances)
                 │
                 ▼
            PostgreSQL
```

### 3.4 Project Structure

```
youtube-watch-party/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── room/
│   │   │   ├── player/
│   │   │   ├── chat/
│   │   │   ├── participants/
│   │   │   ├── reactions/
│   │   │   └── requests/
│   │   ├── pages/            # Home, Login, Register, CreateRoom, JoinRoom, Room
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── context/          # AuthContext, etc.
│   │   ├── services/         # REST API clients
│   │   ├── socket/           # Socket.IO client + event wiring
│   │   ├── types/
│   │   ├── utils/
│   │   └── theme/            # Design tokens
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/         # RoomService, RoomMemberService, RoomAuthorizationService, ...
│   │   ├── middleware/       # authenticate, validation, rate limiting, error handling
│   │   ├── socket/
│   │   │   ├── SocketServer
│   │   │   ├── SocketAuthentication
│   │   │   ├── RoomSocketHandler
│   │   │   ├── PlaybackHandler
│   │   │   ├── RoleHandler
│   │   │   ├── RequestHandler
│   │   │   ├── ChatHandler
│   │   │   └── ReactionHandler
│   │   ├── auth/
│   │   ├── config/
│   │   ├── utils/
│   │   └── app.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── ...
│
├── README.md
├── docker-compose.yml
└── .gitignore
```

---

## 4. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend framework | React 18 + TypeScript | UI |
| Build tool | Vite | Dev server and production bundling |
| Styling | Tailwind CSS | Utility-first styling with design tokens |
| Routing | React Router | Client-side routing and protected routes |
| Real-time client | Socket.IO Client | WebSocket communication |
| Video | YouTube IFrame Player API | Official embedded player |
| Backend runtime | Node.js | Server runtime |
| Web framework | Express.js + TypeScript | REST API |
| Real-time server | Socket.IO | Rooms, broadcasting, reconnection |
| Auth | JWT + bcrypt | Stateless auth and password hashing |
| ORM | Prisma | Type-safe database access and migrations |
| Database | PostgreSQL | Persistent data, source of truth |
| Scaling | Redis + Socket.IO Redis Adapter | Cross-instance event broadcasting |
| Security | Helmet, CORS, rate limiting | Hardening |
| Hosting | Vercel (frontend), Render (backend + PostgreSQL), managed Redis | Deployment |

---

## 5. Frontend Architecture

The frontend is a React + TypeScript SPA organized by responsibility.

| Directory | Responsibility |
|---|---|
| `pages/` | Route-level screens: Home, Login, Register, CreateRoom, JoinRoom, Room |
| `layouts/` | Shared page shells (header, responsive room layout) |
| `components/` | Reusable UI grouped by feature: `auth`, `room`, `player`, `chat`, `participants`, `reactions`, `requests` |
| `context/` | Global state, for example `AuthContext` (user, token, login/logout, persistent session) |
| `hooks/` | Reusable logic such as socket lifecycle, room state, and player sync |
| `services/` | Typed REST API clients |
| `socket/` | Single Socket.IO client instance and event registration and cleanup |
| `theme/` | Design tokens (colors, spacing) |

### Key Components

- **`YouTubePlayer`** wraps the official IFrame Player API (no custom video player).
- **`PlaybackControls`** is shown to Host/Moderator only.
- **`VideoInput`** parses YouTube URLs and IDs and emits `change_video`.
- **`SyncManager`** applies remote state to the player, suppresses echo events, and performs drift correction.
- **`ChatPanel`**, **`ReactionPicker`**, **`ParticipantList`**, **`RequestPanel`**, and **`ConnectionStatus`** cover the rest of the room UI.

### Room Layout

```
┌──────────────────────────────────────────────┐
│ Header                                       │
├─────────────────────────────┬────────────────┤
│                             │ Participants   │
│                             │                │
│       YouTube Player        │ Chat           │
│                             │                │
│                             │                │
├─────────────────────────────┴────────────────┤
│ Playback controls / video information        │
└──────────────────────────────────────────────┘
```

- **Desktop:** the video dominates; participants and chat sit in a side panel.
- **Mobile:** the layout stacks player, controls, participants, and chat.
- **Role-aware UI:** Host/Moderator see playback controls, Participants see request controls, and only the Host sees role-management controls.

> ⚠️ UI restrictions are only a convenience. **Authorization is always enforced by the backend.**

### Design System

The UI is YouTube-inspired, minimal, and uses only this approved palette through semantic tokens:

| Token | Color | Usage |
|---|---|---|
| `--primary` | `#ff2e4c` | Primary actions / CTA |
| `--background` | `#fefefe` | Backgrounds / cards |
| `--foreground` | `#0f0f0f` | Text |
| `--muted` | `#dfe1e3` | Borders / muted UI |
| `--primary-soft` | `#ffa3b3` | Hover / soft accents / badges |
| `--info` | `#065fd4` | Links / informational actions |

No other colors are used; success/error/warning states are expressed with these colors, opacity, borders, icons, and text.

---

## 6. Backend Architecture

The backend is a layered Node.js + Express + TypeScript application.

```
Request → Route → Middleware (auth, validation, rate limit)
        → Controller → Service → Prisma → PostgreSQL
                          │
                          └→ Socket layer (for real-time side effects)
```

| Layer | Responsibility |
|---|---|
| `routes/` | Maps HTTP endpoints to controllers |
| `controllers/` | Parses requests, calls services, shapes responses |
| `services/` | Business logic: `RoomService`, `RoomMemberService`, `RoomAuthorizationService`, playback service, etc. |
| `middleware/` | `authenticate` (JWT), validation, rate limiting, centralized error handling |
| `socket/` | OOP real-time layer (see [section 8](#8-socketio-architecture)) |
| `config/` | Environment, database, Redis, CORS configuration |
| `utils/` | Logging, response helpers, YouTube ID parsing, etc. |

### Key Services

- **`RoomService`** creates rooms, generates unique URL-safe room codes, and fetches room state.
- **`RoomMemberService`** manages memberships and roles (one membership per user per room).
- **`RoomAuthorizationService`** is the single place where role permissions are decided. It always reads the user's role from the database.
- **Playback service** is the single authoritative implementation of play / pause / seek / change video. Direct actions **and** approved participant requests both go through it, so there is no duplicated playback logic.

### Cross-Cutting Concerns

- Centralized error handling and a consistent API response structure
- Structured logging
- Environment-based configuration
- `/health` endpoint
- Graceful shutdown (closes HTTP server, Socket.IO, Prisma, and Redis connections)

---

## 7. Database Architecture

PostgreSQL is the **source of truth**, accessed through Prisma ORM.

```
users
├── id
├── username
├── email            (unique, indexed)
├── password_hash
├── avatar_url
├── created_at
└── updated_at

rooms
├── id
├── room_code        (unique, indexed)
├── name
├── host_id          → users.id
├── current_video_id
├── is_playing
├── current_time
├── state_updated_at
├── created_at
└── updated_at

room_members
├── id
├── room_id          → rooms.id   (indexed)
├── user_id          → users.id   (indexed)
├── role             (HOST | MODERATOR | PARTICIPANT)
├── joined_at
└── last_seen_at
    UNIQUE (room_id, user_id)

messages
├── id
├── room_id          → rooms.id   (indexed)
├── user_id          → users.id
├── message
├── created_at
└── updated_at

reactions
├── id
├── room_id          → rooms.id   (indexed)
├── user_id          → users.id
├── emoji
├── video_time
└── created_at

action_requests
├── id
├── room_id          → rooms.id   (indexed)
├── user_id          → users.id
├── request_type     (REQUEST_PLAY | REQUEST_PAUSE | REQUEST_SEEK | REQUEST_CHANGE_VIDEO)
├── payload
├── status           (PENDING | APPROVED | REJECTED | CANCELLED)
├── reviewed_by      → users.id
├── created_at
└── reviewed_at
```

### Notes

- **Playback state** (`current_video_id`, `is_playing`, `current_time`, `state_updated_at`) lives on the `rooms` table so rooms survive server restarts.
- The `UNIQUE (room_id, user_id)` constraint enforces one membership per user per room.
- **Online presence** is derived from active Socket.IO connections rather than being continuously written to PostgreSQL.
- Indexes exist on `users.email`, `rooms.room_code`, and the `room_id` / `user_id` foreign keys used in frequent lookups.

---

## 8. Socket.IO Architecture

The real-time layer is built with OOP handler classes so that no single "god file" handles every event.

```
socket/
├── SocketServer          # Creates the Socket.IO server, registers handlers, configures the Redis adapter
├── SocketAuthentication  # JWT handshake middleware; attaches userId / username to the socket
├── RoomSocketHandler     # join_room, leave_room, disconnect, presence
├── PlaybackHandler       # play, pause, seek, change_video
├── RoleHandler           # assign_role, remove_participant, transfer_host
├── RequestHandler        # request_action, approve_action, reject_action
├── ChatHandler           # send_message, delete_message
└── ReactionHandler       # send_reaction
```

### Connection Lifecycle

```
1. Client connects with JWT (handshake auth)
2. SocketAuthentication verifies token → attaches { userId, username } to socket
3. Client emits join_room { roomCode / roomId }
4. Server:
     a. verifies the room exists
     b. verifies the user's membership in PostgreSQL
     c. socket.join(roomId)
     d. emits sync_state (current effective playback state) to that socket
     e. broadcasts user_joined to the room
5. On leave / disconnect → socket leaves the room → broadcasts user_left
```

### Room Isolation

Each Socket.IO room is keyed by room ID. Events are always emitted with `io.to(roomId)`, and every handler re-verifies membership, so users in Room A never receive events from Room B.

Each handler follows the same pattern:

```
Authenticate → Verify membership → Validate payload → Authorize by role
            → Update state (PostgreSQL) → Broadcast → Ack / error
```

---

## 9. Real-Time Synchronization Flow

### 9.1 Server-Authoritative State

The server stores the canonical playback state per room:

```json
{
  "videoId": "abc123",
  "isPlaying": true,
  "currentTime": 100,
  "stateUpdatedAt": "2026-01-01T10:00:00.000Z"
}
```

### 9.2 Effective Time Extrapolation

Rather than continuously broadcasting the timestamp, the server computes the current position on demand:

```
if isPlaying:
    effectiveTime = currentTime + (now - stateUpdatedAt)
else:
    effectiveTime = currentTime
```

Example of a late joiner:

```
Server state:  currentTime = 100, stateUpdatedAt = 10:00:00, isPlaying = true
New user joins at 10:00:05
→ effectiveTime = 100 + 5 = 105 seconds
```

The new user starts at the right position instead of several seconds behind.

### 9.3 Playback Event Flow

```
Host / Moderator                Server                    All clients in room
      │                           │                              │
      │  play / pause / seek /    │                              │
      │  change_video             │                              │
      ├──────────────────────────▶│                              │
      │                           │ 1. authenticate socket       │
      │                           │ 2. load role from DB         │
      │                           │ 3. permission check          │
      │                           │ 4. update room state         │
      │                           │ 5. persist to PostgreSQL     │
      │                           ├─────────────────────────────▶│
      │                           │   broadcast to room          │
      │                           │                              │ update YouTube player
      │                           │                              │ (no re-emit)
```

### 9.4 Loop and Echo Prevention

- **Local** user actions emit socket events.
- **Remote** updates only change the player and are flagged so they never trigger another emit.
- This flag-based suppression prevents infinite client-server rebroadcast loops.

### 9.5 Drift Correction

- If local playback differs from server state by a **small threshold**, the client does nothing (avoids jittery seeking).
- If drift exceeds the threshold, the client seeks to the corrected position.

### 9.6 Edge Cases Handled

- YouTube player not yet ready (state is queued and applied when ready)
- Invalid video IDs / URLs
- Video loading and video-ended states
- Socket reconnection followed by full state resync

---

## 10. RBAC Explanation

### Roles and Permissions

| Action | Host | Moderator | Participant |
|---|:---:|:---:|:---:|
| Watch video | ✅ | ✅ | ✅ |
| Play / Pause | ✅ | ✅ | ❌ (can request) |
| Seek | ✅ | ✅ | ❌ (can request) |
| Change video | ✅ | ✅ | ❌ (can request) |
| Approve / reject participant requests | ✅ | ✅ | ❌ |
| Send chat messages | ✅ | ✅ | ✅ |
| Send reactions | ✅ | ✅ | ✅ |
| Delete chat messages | ✅ | ✅ | ❌ (own messages: see limitations) |
| Assign / change roles | ✅ | ❌ | ❌ |
| Remove participant | ✅ | ❌ | ❌ |
| Transfer host | ✅ | ❌ | ❌ |

### Enforcement Rules

- The server **always** reads the user's role from PostgreSQL. Roles, `userId`, and permissions sent by the client are ignored.
- The Host can change `PARTICIPANT → MODERATOR` and `MODERATOR → PARTICIPANT`.
- **Transfer host** runs in a **database transaction**: the old Host becomes a normal member, the target becomes Host. A room can never end up with zero Hosts.
- **Remove participant:** the membership is deleted, `participant_removed` is emitted, the target's socket is removed from the room, and later room events from that user are rejected.
- Destructive actions require a confirmation dialog in the UI, but the backend remains the real gatekeeper.

---

## 11. Participant Request Workflow

Participants cannot change playback directly. Instead they submit **action requests**.

```
Participant
    │  request_action { type, payload }
    ▼
Backend validates membership
    ▼
Create ActionRequest (status = PENDING)
    ▼
Broadcast action_request_created → HOST + MODERATORS
    ▼
Host / Moderator reviews
    ├── approve_action ──▶ verify reviewer role
    │                       execute via the SAME playback service
    │                       broadcast playback event to room
    │                       status = APPROVED
    │                       action_request_updated → requester
    │
    └── reject_action ───▶ status = REJECTED
                            action_request_updated → requester
```

**Request types:** `REQUEST_PLAY`, `REQUEST_PAUSE`, `REQUEST_SEEK`, `REQUEST_CHANGE_VIDEO`
**Statuses:** `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`

Only Host and Moderator can review, and this is validated server-side. Approval reuses the authoritative playback service so playback logic is never duplicated.

---

## 12. Chat Architecture

```
Client ── send_message { roomId, message } ──▶ ChatHandler
                                                 │
                                    1. authenticate socket
                                    2. verify room membership
                                    3. validate + sanitize message
                                    4. persist to PostgreSQL
                                    5. broadcast new_message
                                                 │
                                                 ▼
                                       All clients in the room
```

- **Real-time only:** no polling; chat is delivered over Socket.IO.
- **Persistent:** messages are stored in PostgreSQL, and recent history is loaded when a user enters the room, so refreshing does not erase chat.
- **Moderation:** Host/Moderator can delete messages (`delete_message` → `message_deleted`), with the role verified on the server.
- **Frontend `ChatPanel`:** timestamps, auto-scroll, Enter-to-send, empty/loading states, mobile responsive, distinct style for the current user's own messages, and duplicate-safe after reconnect.

---

## 13. Reaction Architecture

```
Client ── send_reaction { roomId, emoji, videoTime } ──▶ ReactionHandler
                                                          │
                                       1. authenticate socket
                                       2. verify room membership
                                       3. validate emoji (allow-list)
                                       4. persist to PostgreSQL
                                       5. broadcast new_reaction
```

- **Allowed emojis:** ❤️ 👍 😂 🔥 👏 😮 (server-side allow-list).
- Each reaction is stored with the **video timestamp** at which it occurred, so reactions can be tied to key moments.
- The frontend shows a picker and a lightweight floating animation, kept simple for performance.

---

## 14. Redis Scalability Architecture

**Goal:** support many concurrent rooms and users by running multiple backend instances behind a load balancer.

- The **Socket.IO Redis Adapter** relays events between instances through Redis Pub/Sub. A broadcast to `io.to(roomId)` on Server 1 also reaches sockets connected to Server 2.
- **PostgreSQL remains the source of truth** for users, rooms, memberships, messages, requests, and reactions. Redis only handles cross-server Socket.IO communication and ephemeral coordination, and no permanent business data lives only in Redis.
- Redis is **optional in local development**: if `REDIS_URL` is not set, the server runs single-instance with the default in-memory adapter and identical behavior.
- Redis failures are handled gracefully, and connections are closed on shutdown.

> For multi-instance deployments behind a load balancer, enable **sticky sessions** (or force the WebSocket transport) so Socket.IO's handshake works reliably.

---

## 15. Authentication Flow

```
Register / Login
      │
      ▼
Server validates input → bcrypt hash (register) / compare (login)
      │
      ▼
Server signs JWT { userId } with JWT_SECRET (with expiry)
      │
      ▼
Client stores token → AuthContext (persistent login)
      │
      ├── REST: Authorization: Bearer <token> → `authenticate` middleware
      └── Socket.IO: token in handshake auth → SocketAuthentication middleware
                          │
                          ▼
             attaches { userId, username } to the request / socket
```

- Passwords are **never stored in plain text** (bcrypt).
- The JWT contains only the user ID; role information is always loaded from the database.
- Frontend: `AuthContext`, login and register pages, `ProtectedRoute`, logout, and session persistence.

---

## 16. Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local install or Docker)
- (Optional) Redis, only needed to test multi-instance scaling

### Steps

```bash
# 1. Clone
git clone https://github.com/<your-username>/youtube-watch-party.git
cd youtube-watch-party

# 2. Backend
cd backend
cp .env.example .env        # fill in the values (see section 17)
npm install
npx prisma migrate dev      # creates tables (see section 18)
npm run dev                 # starts the API + Socket.IO server

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env        # set VITE_API_URL and VITE_SOCKET_URL
npm install
npm run dev                 # starts Vite dev server
```

Optional: start PostgreSQL (and Redis) with Docker Compose:

```bash
docker-compose up -d
```

---

## 17. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/synctube` |
| `JWT_SECRET` | Secret used to sign JWTs (use a long random value) | `change-me` |
| `FRONTEND_URL` | Allowed origin for CORS and Socket.IO CORS | `http://localhost:5173` |
| `REDIS_URL` | *(Optional)* Redis connection string for multi-instance scaling | `redis://localhost:6379` |
| `PORT` | Server port | `4000` |
| `NODE_ENV` | `development` or `production` | `development` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend REST base URL | `http://localhost:4000/api` |
| `VITE_SOCKET_URL` | Backend Socket.IO URL | `http://localhost:4000` |
| `VITE_YOUTUBE_API_KEY` | *(Only if required by the implementation)* | – |

> Never commit `.env` files or secrets to Git.

---

## 18. Database Migration

```bash
cd backend

# Validate the schema
npx prisma validate

# Generate the Prisma client
npx prisma generate

# Create and apply a migration (development)
npx prisma migrate dev --name init

# Apply existing migrations (production)
npx prisma migrate deploy

# Inspect the database
npx prisma studio
```

---

## 19. Development Commands

> Script names below follow common conventions. Confirm them against each `package.json`.

| Where | Command | Purpose |
|---|---|---|
| backend | `npm run dev` | Start the server in watch mode |
| backend | `npm run build` | Compile TypeScript |
| backend | `npm start` | Run the compiled server |
| backend | `npm test` | Run backend tests |
| frontend | `npm run dev` | Start the Vite dev server |
| frontend | `npm run build` | Production build |
| frontend | `npm run preview` | Preview the production build |

### Testing Strategy

Tests prioritize critical business logic:

- **Auth:** register, login, invalid credentials
- **Rooms:** create, join, invalid room, duplicate membership
- **RBAC:** host, moderator, and participant permissions; unauthorized role assignment/removal; host transfer
- **Playback:** play, pause, seek, change video, synchronization
- **Requests:** create, approve (moderator/host), reject, unauthorized approval
- **Chat:** authenticated send, unauthorized rejection, room isolation
- **Security:** invalid/expired JWT, spoofed `userId`, `role`, and `roomId`
- **Socket.IO:** join/leave, state sync, real-time playback/chat/reactions, reconnection, room isolation

---

## 20. Production Deployment

### Target Architecture

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend (Express + Socket.IO) | Render (Web Service) |
| Database | Render PostgreSQL |
| Redis | Managed Redis service (Redis-compatible) |

### Backend on Render

- **Build command:** `npm install && npx prisma generate && npm run build`
- **Start command:** `npx prisma migrate deploy && npm start`
- **Health check path:** `/health`
- **Environment variables:** `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `REDIS_URL`, `PORT`, `NODE_ENV=production`

### Frontend on Vercel

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:** `VITE_API_URL`, `VITE_SOCKET_URL` (point to the Render backend, never `localhost`)
- Add an SPA rewrite so client-side routes such as `/room/:roomCode` resolve to `index.html`.

### Production Checklist

- [ ] `FRONTEND_URL` matches the deployed Vercel URL (REST CORS **and** Socket.IO CORS)
- [ ] Secrets are set in platform dashboards, not in Git
- [ ] Graceful shutdown closes HTTP, Socket.IO, Prisma, and Redis
- [ ] `/health` returns OK
- [ ] WebSocket connection works over WSS

---

## 21. Live URL

| Resource | URL |
|---|---|
| Frontend | `https://<your-frontend>.vercel.app` |
| Backend health | `https://<your-backend>.onrender.com/health` |

> *(Replace the placeholders after deployment.)*
> Free-tier Render instances may sleep when idle, so the first request can take a while to wake up.

---

## 22. API Documentation

**Base URL:** `/api`
Authenticated endpoints require the header `Authorization: Bearer <token>`.

### Health

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| GET | `/health` | ❌ | Service health check |

### Auth

| Method | Endpoint | Auth | Body | Description |
|---|---|:---:|---|---|
| POST | `/api/auth/register` | ❌ | `{ username, email, password }` | Create an account |
| POST | `/api/auth/login` | ❌ | `{ email, password }` | Log in, returns a JWT |
| GET | `/api/auth/me` | ✅ | – | Current authenticated user |

### Rooms

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| POST | `/api/rooms` | ✅ | Create a room (creator becomes HOST) |
| GET | `/api/rooms/:roomCode` | ✅ | Get room details by code |
| POST | `/api/rooms/:roomCode/join` | ✅ | Join a room (default role: PARTICIPANT) |
| GET | `/api/rooms/:roomId/members` | ✅ | List room members and their roles |

Responses use a consistent envelope, for example:

```json
{ "success": true, "data": { }, "message": "..." }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

---

## 23. Socket Event Documentation

Connect with the JWT in the handshake: `io(SOCKET_URL, { auth: { token } })`.

### Room

| Event | Direction | Payload | Who | Description |
|---|---|---|---|---|
| `join_room` | Client → Server | `{ roomId \| roomCode }` | Members | Join the Socket.IO room |
| `leave_room` | Client → Server | `{ roomId }` | Members | Leave the room |
| `user_joined` | Server → Room | `{ user, role }` | – | A member joined |
| `user_left` | Server → Room | `{ userId }` | – | A member left |
| `sync_state` | Server → Client | `{ videoId, isPlaying, effectiveTime, ... }` | – | Current room state |

### Playback

| Event | Direction | Payload | Who | Description |
|---|---|---|---|---|
| `play` | Client → Server → Room | `{ roomId, time }` | Host, Moderator | Start playback |
| `pause` | Client → Server → Room | `{ roomId, time }` | Host, Moderator | Pause playback |
| `seek` | Client → Server → Room | `{ roomId, time }` | Host, Moderator | Seek to a time |
| `change_video` | Client → Server → Room | `{ roomId, videoId }` | Host, Moderator | Change the video |

### Roles and Moderation

| Event | Direction | Who | Description |
|---|---|---|---|
| `assign_role` | Client → Server | Host | Promote or demote a member |
| `role_assigned` | Server → Room | – | Role change broadcast |
| `transfer_host` | Client → Server | Host | Transfer host ownership |
| `remove_participant` | Client → Server | Host | Remove a member |
| `participant_removed` | Server → Room / target | – | Member was removed |

### Requests

| Event | Direction | Who | Description |
|---|---|---|---|
| `request_action` | Client → Server | Participant | Ask for a playback action |
| `action_request_created` | Server → Host/Moderators | – | New pending request |
| `approve_action` | Client → Server | Host, Moderator | Approve and execute |
| `reject_action` | Client → Server | Host, Moderator | Reject |
| `action_request_updated` | Server → Requester / reviewers | – | Status changed |

### Chat and Reactions

| Event | Direction | Who | Description |
|---|---|---|---|
| `send_message` | Client → Server | Members | Send a chat message |
| `new_message` | Server → Room | – | New chat message |
| `delete_message` | Client → Server | Host, Moderator | Delete a message |
| `message_deleted` | Server → Room | – | Message removed |
| `send_reaction` | Client → Server | Members | Send an emoji reaction |
| `new_reaction` | Server → Room | – | New reaction |

### Errors and Connection

| Event | Direction | Description |
|---|---|---|
| `permission_denied` | Server → Sender | Action rejected for insufficient role |
| `room_error` | Server → Sender | Invalid room, membership, or payload |
| `connect` / `disconnect` | Built-in | Connection lifecycle |

**Connection states shown in the UI:** `CONNECTED`, `CONNECTING`, `DISCONNECTED`, `RECONNECTING`.

---

## 24. Security Considerations

| Area | Measure |
|---|---|
| Passwords | bcrypt hashing; never stored or logged in plain text |
| Auth | JWT with expiry; verified on every REST request and Socket.IO handshake |
| Authorization | Role always loaded from the DB; client-supplied `userId`, `role`, and `roomId` are never trusted |
| Room access | Membership verified before joining a room and on every room event |
| Input validation | Usernames, emails, room codes, YouTube URLs/IDs, chat messages, request payloads, and emojis |
| XSS | Chat/message sanitization and safe rendering |
| SQL injection | Parameterized queries via Prisma |
| Abuse | Rate limiting on REST and socket events (for example chat) |
| Headers / CORS | Helmet and strict CORS (REST and Socket.IO) limited to `FRONTEND_URL` |
| Errors | Centralized error handling that avoids leaking internals |
| Secrets | Environment variables only; `.env` in `.gitignore` |

---

## 25. Design Decisions

**Why an authoritative server?**
If clients controlled state, any participant could send fake `play` or `seek` events, and clients could disagree with each other. A single source of truth makes permissions enforceable and sync consistent.

**Why Socket.IO instead of raw WebSockets?**
It provides rooms, broadcasting, acknowledgements, automatic reconnection, and transport fallback out of the box, and it has an official Redis adapter for scaling. It still uses WebSocket as its primary transport.

**Why store `currentTime` + `stateUpdatedAt` instead of streaming the time?**
It removes the need for constant time broadcasts. The server can compute the exact position for any moment and for any late joiner: `currentTime + elapsed`.

**Why PostgreSQL?**
The data is relational (users ↔ rooms ↔ memberships ↔ messages). Constraints such as one membership per user per room are enforced by the database, and rooms persist across restarts.

**Why Prisma?**
Type-safe queries, schema-as-code, and simple migrations.

**Why a single playback service?**
Direct Host/Moderator actions and approved participant requests use the same code path, so permission and state logic exist in exactly one place.

**Why OOP socket handlers?**
Each concern (rooms, playback, roles, chat, reactions, requests) is isolated in its own class. New features can be added without growing one giant socket file.

**Why Redis only as an adapter?**
Redis carries ephemeral cross-instance messages. PostgreSQL remains the source of truth, which keeps the system simple and avoids data-loss risk if Redis restarts.

**Why an official YouTube IFrame player?**
It follows YouTube's terms and avoids building a custom player, and it exposes a stable API for play, pause, seek, and state events.

---

## 26. Trade-offs

| Decision | Benefit | Cost |
|---|---|---|
| Server-authoritative state | Secure, consistent | Extra latency (one round trip) before others update |
| Time extrapolation | Cheap, accurate join sync | Assumes reasonably synchronized clocks and no long buffering stalls |
| Drift threshold | Avoids jittery re-seeking | Small drift may persist below the threshold |
| Persist state in PostgreSQL | Rooms survive restarts | Write per playback event (acceptable at current scale) |
| Redis adapter | Horizontal scaling | Extra infrastructure; needs sticky sessions |
| JWT (stateless) | Simple, scalable auth | Tokens can't be revoked instantly without extra work |
| Free-tier hosting | Low/no cost | Cold starts and limited resources |

---

## 27. Known Limitations

> Review this list against the final implementation and edit it to be accurate.

- Sync accuracy depends on network latency and YouTube buffering, so "perfect" sync is approximate (typically within about a second).
- Some YouTube videos disable embedding, and those cannot be played in the IFrame player.
- JWTs are not revocable before expiry (no refresh-token or blocklist flow).
- No email verification or password reset.
- No private/password-protected rooms; anyone with the room code can join.
- Free-tier hosting can cause cold-start delays.
- Multi-instance deployment requires sticky sessions and a working Redis instance.
- Participants cannot delete or edit their own chat messages (only Host/Moderator can delete).

---

## 28. Future Improvements

- Refresh tokens and token revocation
- OAuth / social login
- Private rooms (passwords or invite-only) and a Host-approval join flow
- Video queue / playlists
- Speaker-style voice or video chat
- Message editing, replies, and typing indicators
- Reaction analytics (heatmap of popular moments)
- Redis-backed presence and rate limiting
- Automatic Host reassignment when the Host disconnects
- End-to-end tests (Playwright) and load testing (k6 / Artillery) to verify 1,000+ users, 100+ rooms, and 50+ users per room
- Observability: metrics, tracing, and error monitoring

---

## License

MIT *(or your preferred license)*
