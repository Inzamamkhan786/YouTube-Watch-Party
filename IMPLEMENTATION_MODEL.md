# Implementation Model: YouTube Watch Party

This document is the compact engineering summary of the work completed so far. It is designed to be read quickly by a human or an AI without needing to inspect the entire codebase.

## 1) Product Model

The app is a real-time YouTube watch-party platform with:
- user auth and room creation
- host/moderator/participant roles
- synchronized playback control
- shared chat and reactions
- persistent room data
- YouTube video loading and room state sync

Core rule:
- The backend is the source of truth for room state and permissions.
- The frontend only sends actions and renders the server-authoritative state.

---

## 2) System Architecture

### A. Frontend
Location: `client/src`

Primary responsibilities:
- page routing and auth flow
- room UI and join/create flows
- YouTube iframe embedding
- socket events for playback/chat/reactions
- URL parsing and video ID normalization

Important modules:
- `App.tsx` — app shell and routing
- `pages/RoomPage.tsx` — main room UI and playback sync
- `components/YouTubePlayer.tsx` — iframe API lifecycle
- `utils/youtube.ts` — video URL parsing and validation
- `services/*` and `context/*` — API and auth state

### B. Backend
Location: `server/src`

Primary responsibilities:
- auth, JWT, room creation and membership
- permission enforcement and role checks
- database-backed room state
- playback action validation
- websocket events and broadcast logic
- health checks and CORS/proxy handling

Important modules:
- `app.ts` — Express bootstrap and middleware
- `routes/*.ts` — REST endpoints
- `services/*.ts` — room, auth, playback logic
- `socket/*.ts` — event handlers and broadcasts
- `lib/prisma.ts` — Prisma client

### C. Data layer
- PostgreSQL: authoritative room, user, role, and membership data
- Redis: optional Socket.IO adapter for multi-instance scaling
- Prisma ORM: schema + migrations

---

## 3) Runtime Flow

### User lifecycle
1. Register or login
2. Create or join a room
3. Host controls playback or moderators approve requests
4. All clients receive the same playback state via socket events

### Playback lifecycle
1. User enters a room
2. Client loads a valid YouTube URL or raw video ID
3. App extracts a valid 11-character ID
4. The server stores or validates the `currentVideoId`
5. The host triggers play/pause/seek
6. Backend validates permissions and broadcasts state
7. Client updates the embedded YouTube player safely

---

## 4) Key Implementation Decisions

### A. Authoritative backend model
Every privileged action is validated by the server before changing state.

Example:
- participant sends `play` -> backend checks role
- host/moderator allowed -> state updates -> broadcast to room
- participant denied -> no state change

This prevents client-side tampering and keeps room state consistent.

### B. Robust YouTube ID extraction
The client must accept several valid input forms:
- `https://www.youtube.com/watch?v=abc123...`
- `https://youtu.be/abc123...`
- `https://www.youtube.com/shorts/...`
- `https://www.youtube.com/embed/...`
- raw `abc123...` 11-character IDs

Validated requirement:
- video ID must match `^[A-Za-z0-9_-]{11}$`

### C. Defensive player lifecycle
A major runtime issue was caused by calling `YT.Player` methods before the player was initialized.

Fix pattern:
- guard against missing player object
- wait until iframe/player ready
- only call methods when available
- fallback values for time/duration until actual metadata exists

---

## 5) Problems Solved So Far

### Issue 1: Render deployment proxy failure
Root cause:
- Express behind Render trusted a proxy incorrectly
- forwarded IP header handling broke the app on production deployment

Fix:
- set `app.set('trust proxy', 1)` in the backend
- verified the server can operate behind the load balancer

### Issue 2: YouTube URL parsing rejected valid links
Root cause:
- URL extraction logic was too narrow and failed for Shorts / short links / embed patterns

Fix:
- normalized multiple valid YouTube URL formats
- extracted a proper 11-character video ID
- accepted valid room initialization video IDs on both client and server

### Issue 3: Player methods executed before iframe ready
Root cause:
- room state and UI updated before the embedded player was ready
- calls like `getCurrentTime()` / `seekTo()` / `playVideo()` ran on uninitialized player objects

Fix:
- guard access with readiness checks
- avoid unsafe `NaN` states
- keep UI fallback metrics until the player is initialized

### Issue 4: Stale frontend deployment confusion
Root cause:
- Vercel or cached frontend bundle could be stale even after code fixes

Fix:
- verified the live local frontend was serving current code
- confirmed deployment freshness matters before trusting a remote deployment

---

## 6) Implementation Status Summary

Completed and validated:
- backend startup and health checks working locally
- frontend startup and route serving working locally
- room creation flow working
- valid YouTube input accepted
- room stores a valid video ID
- embedded iframe loads
- playback action executes without immediate crash
- local end-to-end room flow confirmed in browser

Validated evidence:
- server logs: "Server listening on http://localhost:4000"
- frontend logs: "VITE ready in ... Local: http://localhost:5173/"
- room created successfully with code `PFKUAV`
- page displayed video timer `0:00 / 53:27`
- player state changed to `Pause` after starting, confirming live playback UI interaction

---

## 7) Current Architecture in One Line

`React client + Express backend + Prisma/PostgreSQL + Socket.IO + YouTube iframe + RBAC validation`.

---

## 8) Minimal AI Readability Format

If you want a very compact explanation for an AI agent or teammate:

- App type: real-time collaborative YouTube room app
- User flow: register → create/join room → host controls playback
- Trust model: backend authoritative; frontend acts as view/control layer only
- Core risks fixed: proxy trust, URL parsing, player readiness, stale front-end deployment
- Data stores: PostgreSQL + optional Redis adapter
- Communication layer: Socket.IO for room sync and real-time events
- Validation done: local backend up, frontend up, room created, valid YouTube ID loaded, player active

---

## 9) Recommended Mental Model

Think of the app as:
- a state machine for rooms and member roles
- a real-time synchronization layer for playback events
- a permission boundary enforced by the server
- a browser iframe wrapper around YouTube playback

The highest-value architectural truth is this:

> The actual room correctness comes from the backend, and the actual media playback correctness comes from waiting for the YouTube player to become ready before interacting with it.

---

## 10) Next Best Actions

Priority tasks going forward:
1. clean up remaining NaN/time warnings during player readiness
2. validate multi-user join/sync behavior across two browser clients
3. verify approval-based playback request flow end-to-end
4. test production deployment freshness and env parity
5. document the final socket event schema and room state contract

This document is intentionally short and high-signal for faster comprehension.
