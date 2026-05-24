# Discord Clone — Web Dev Comp 2026

Full-stack Discord clone built for the Web Development Competition 2026 final.

## Stack

**Client** — Vite + React 18 + TypeScript + Tailwind 3.4 + Zustand + React Query + Socket.io-client + simple-peer (WebRTC)

**Server** — Node + Express + Socket.io + Mongoose + MongoDB + JWT + bcryptjs

## Repo layout

```
client/   — Vite SPA (pages, layout, features, lib, store)
server/   — Express API + Socket.io signaling + Mongoose models
landing/  — separate landing page
figma-assets/ — UI specs extracted from Figma (d17 friends, d19 server, d20 settings)
sounds/   — source SFX (also copied to client/public/sounds)
Profile/  — source avatars (also copied to client/public/avatars)
```

### Client highlights

| Path | What it does |
|---|---|
| `src/App.tsx` | router (login / register / app shell + nested routes) |
| `src/pages/AppLayout.tsx` | guild rail + Outlet + global modals + incoming-call toast |
| `src/pages/HomeView.tsx` | Friends view (d17) — online/all/pending tabs, message/call buttons |
| `src/pages/DMView.tsx` | direct-message channel + voice call split-pane |
| `src/pages/ServerView.tsx` | guild + channel + chat / voice panel |
| `src/pages/DiscoverView.tsx` | public server grid (d18) |
| `src/layout/DMSidebar.tsx` | shared DM list sidebar |
| `src/layout/ChannelSidebar.tsx` | guild channels + browse modal |
| `src/layout/UserPanel.tsx` | bottom user widget (mic/deafen/settings) |
| `src/features/chat/*` | MessageList, MessageItem, Composer, useChat |
| `src/features/voice/useWebRTC.ts` | simple-peer mesh, mic/cam/screen toggles |
| `src/features/voice/VoicePanel.tsx` | tile grid + Discord-style pill control bar |
| `src/features/profile/SettingsModal.tsx` | editable account page (d20) |
| `src/features/invite/{Join,Create}ServerModal.tsx` | invite-code join + 3-step create-server flow |
| `src/lib/sfx.ts` | sound effect cache + playback |
| `src/lib/socket.ts` | socket.io client w/ JWT auth handshake |
| `src/store/{auth,voice}.ts` | Zustand stores (persisted auth, voice toggles) |

### Server highlights

| Path | What it does |
|---|---|
| `src/index.js` | express + http + socket.io bootstrap, JWT middleware |
| `src/db.js` | mongoose connect |
| `src/models/` | User, Guild, Channel, Membership, Message |
| `src/routes/auth.js` | register / login (JWT) |
| `src/routes/guilds.js` | create guild (templates), list mine, PATCH /me profile |
| `src/routes/messages.js` | GET history, PATCH/DELETE own messages |
| `src/routes/dms.js` | find-or-create DM channel, list my DMs |
| `src/routes/invites.js` | code preview + join |
| `src/routes/search.js` | text-index message search |
| `src/routes/discover.js` | public guilds + all-users list |
| `src/sockets/chat.js` | `channel:join`, `message:create`, broadcast |
| `src/sockets/voice.js` | WebRTC signaling, voice rooms, DM ring event |
| `src/sockets/presence.js` | online/idle/dnd/offline status broadcast |
| `src/seed.js` | hand-seeded 3 guilds × 4-5 channels × 6 users × 30+ messages |

## How DMs work

1. Friends row → click Message → `POST /api/dms { userId }` → backend finds or creates a `Channel` with `type: 'dm'` and `participantIds: [me, you]`, returns channel id.
2. Client navigates `/app/dm/:channelId`. The DM channel reuses the same `Message` model and the existing socket flow (`channel:join`, `message:create`, `message:new`).
3. Phone icon in DM header (or Phone button on friend row with `?call=1`) flips a local `inCall` flag → `VoicePanel` mounts with the DM channel id → joins voice room.
4. Server `voice:join` on a DM channel emits `dm:incoming-call` to the other participant's `user:<id>` socket room. AppLayout renders an Accept/Decline toast; Accept navigates with `?call=1`.

## Run it locally

```bash
# 1. Mongo
brew services start mongodb-community

# 2. Server
cd server
cp .env.example .env   # or create: MONGO_URI=mongodb://127.0.0.1:27017/discord_comp, JWT_SECRET=dev-secret, PORT=4000, CLIENT_ORIGIN=http://localhost:5173
npm install
node src/seed.js       # seed demo guilds + users (alice…frank / password)
npm run dev

# 3. Client (separate terminal)
cd client
npm install
npm run dev            # http://localhost:5173
```

Log in with `alice` / `password` (or bob/carol/dave/eve/frank). Open a second incognito window as bob to test real-time chat, voice, and DM ringing.

## Demo paths (brief §5)

1. **Browse + display** — login → 3 guilds in rail → switch guild → channels load from DB.
2. **Search** — ⌘K → keyword from seed → click result → jumps to channel + scrolls to message.
3. **Chat CRUD + history** — send / hover-edit / hover-delete / scroll-up paginates older messages.
4. **Invite + voice/video** — guild rail + → invite code → preview → join. Voice channel → mic permission → 2 windows hear/see each other → video toggle → screen share.
5. **Profile + status** — User panel → status menu → DND propagates via socket. Settings (gear) → edit display name / email / phone / avatar color → persists.

## Bonus features

- **Direct messages** with voice/video call (split-pane in DM view).
- **Incoming-call ringing** toast with Accept/Decline.
- **SFX** for message, mute/unmute, deafen, voice join/leave, outgoing call.
- **Create-Server wizard** (3-step Discord-style: choose template → customize name/icon → audience).
- **Discover** page (public guild grid).
