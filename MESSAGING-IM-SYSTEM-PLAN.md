# Highlander Today — Messaging And IM System Plan

> **Status:** Product and architecture planning only. Not implemented.
> **Purpose:** Define a unified real-time messaging system that combines Facebook Messenger-style direct messaging, Slack/IRC-style topic rooms and channels, push notifications, and native mobile compatibility — all built on top of the existing conversation and message infrastructure.

---

## Product Intent

Highlander Today already has working person-to-person direct messaging. This plan extends that foundation into a full community communication system with three distinct interaction modes:

1. **Direct Messages** — private 1-to-1 conversations between community members (exists today, needs real-time upgrade)
2. **Rooms / Channels** — persistent topic-based group conversations that any eligible member can browse, join, leave, and participate in (new)
3. **Organization Inboxes** — person-to-organization communication through role-based mailboxes (separate domain, documented in `ORGANIZATION-INBOX-CRM-PLAN.md`)

The user-facing messaging hub should present DMs and Rooms as two primary tabs, with organization communication surfaced through a third tab or through the existing organization surfaces depending on final UX direction.

---

## Core Architectural Rules

### Build on the existing message infrastructure

The current `Conversation`, `ConversationParticipant`, `Message`, and `MessageAttachment` models are sound. Rooms/channels should extend this system rather than replacing it. A `Channel` is a conversation with additional metadata — name, description, topic, join/leave semantics, and discovery.

### Keep organization messaging separate

`ORGANIZATION-INBOX-CRM-PLAN.md` already establishes that organization communication is a distinct domain with role-based mailboxes, contact profiles, and assignment workflow. This plan does not replace that. Organization inbox threads should not live in the `Channel` or `Conversation` tables.

### Real-time is a transport layer, not business logic

Real-time delivery (Pusher, SSE, or self-hosted WebSockets) should be a thin notification layer on top of the existing API-first message persistence. Every message is written to the database through the existing API routes first, then broadcast to connected clients. If real-time delivery fails, the message is still persisted and will appear on next fetch.

### API-first for native mobile compatibility

All messaging features must be fully accessible through the existing REST API surface. The web client and any future Android/iOS native app consume the same endpoints. Real-time subscriptions use Pusher's platform-native SDKs (JavaScript for web, native SDKs for Android/iOS) or equivalent, but the underlying message flow is always: client -> API -> database -> broadcast.

---

## Product Model

### Tab 1: Direct Messages

This is the existing messaging system with real-time upgrades.

Current capabilities that carry forward:

- 1-to-1 conversations between community members
- Unread tracking via `lastReadAt` per participant
- Block enforcement (bidirectional)
- Trust-gated message composition
- Message body up to 5000 characters
- File attachment metadata storage
- Activity logging on message send

New capabilities needed:

- Real-time message delivery (new messages appear instantly without refresh)
- Typing indicators
- Online/presence indicators (optional, privacy-sensitive)
- Unread badge updates in real-time across the shell/navigation
- Read receipts (optional, can be phase 2)
- Browser push notifications for backgrounded tabs
- Mobile push notifications (when native app exists)

### Tab 2: Rooms / Channels

This is the new group messaging system, inspired by Slack channels and IRC rooms.

A room is a persistent, named conversation space that community members can discover, join, participate in, and leave.

Room properties:

- **Name** — display name, unique within the community (e.g., `General`, `Fishing`, `Local Politics`, `Buy/Sell/Trade`, `Youth Sports`)
- **Slug** — URL-safe identifier
- **Description** — short purpose statement
- **Topic** — current discussion topic, changeable by room staff
- **Visibility** — `PUBLIC` (browsable and joinable by any eligible member) or `PRIVATE` (invite-only, hidden from browse)
- **Trust requirement** — minimum trust level to join (`REGISTERED` or `TRUSTED`)
- **Creator** — the user who created the room
- **Community** — tenant-scoped

Room membership:

- Users explicitly join and leave rooms
- Joining creates a `ConversationParticipant` record (or equivalent `ChannelMember` record)
- `lastReadAt` tracking works the same as DM conversations
- Room creators and designated moderators can remove members
- Removed/banned members cannot rejoin without moderator action

Room roles:

- **Owner** — the creator or transferred owner; can edit room settings, assign moderators, delete the room
- **Moderator** — can pin messages, remove members, delete messages within the room
- **Member** — can read and send messages

Room discovery:

- A dedicated browse/search surface within the Rooms tab
- Shows public rooms with name, description, member count, and last activity
- Join button for rooms the user has not yet joined
- Filter by category/tag (optional, can be phase 2)

### Tab 3: Organization Messages (direction TBD)

Two options under consideration:

**Option A — Unified tab:** A third tab in the messaging hub showing the user's active organization inbox threads. This gives users one place to see all their communication.

**Option B — Organization-surface only:** Organization messages appear only within `/organizations/[slug]` and the org admin surfaces. Users check organization communication separately from personal messaging.

**Option C — Both:** Users see org threads in a unified messaging view, and org staff also get a dedicated management surface.

Recommendation: defer this decision until the organization inbox MVP from `ORGANIZATION-INBOX-CRM-PLAN.md` is built. The real-time transport layer designed here will support organization messages regardless of where they surface in the UI.

---

## Real-Time Architecture

### Recommended approach: Managed service (Pusher) for launch

Pusher (or equivalent: Ably, Supabase Realtime) provides:

- Persistent client connections managed by the service
- Channel-based pub/sub (maps naturally to conversations and rooms)
- Platform-native SDKs: JavaScript (web), Android, iOS, Flutter
- Presence channels for online/typing indicators
- Free tier: 100 concurrent connections, 200k messages/day
- First paid tier (~$49/month): 500 concurrent connections, 1M messages/day

### Integration pattern

**Server-side (API routes):**

```
// After persisting message to database
await pusher.trigger(`conversation-${conversationId}`, 'new-message', {
  id: message.id,
  senderId: message.senderUserId,
  body: message.body,
  createdAt: message.createdAt,
  attachments: message.attachments,
});
```

**Client-side (React components):**

```
// Subscribe to conversation events
const channel = pusher.subscribe(`conversation-${conversationId}`);
channel.bind('new-message', (data) => {
  // Append message to local state
  setMessages(prev => [...prev, data]);
});
```

### Channel naming convention

- DM conversations: `private-conversation-{conversationId}`
- Rooms: `presence-room-{channelId}` (presence channels enable member list and typing)
- User-level notifications: `private-user-{userId}` (unread counts, mentions, alerts)
- Organization threads: `private-org-thread-{threadId}` (when org inbox is built)

### Event types

- `new-message` — a message was sent
- `message-deleted` — a message was removed by author or moderator
- `typing-start` / `typing-stop` — typing indicators
- `member-joined` / `member-left` — room membership changes
- `unread-update` — pushed to user's private channel when their unread state changes
- `thread-update` — metadata changes (topic, room settings)

### Migration path to self-hosted

If Pusher costs become disproportionate at scale:

1. Deploy a standalone WebSocket server (Node.js + `ws` library) on a VPS or container service
2. Add Redis pub/sub as the message broker between API servers and WebSocket servers
3. Replace Pusher server-side triggers with Redis publishes
4. Replace Pusher client-side subscriptions with native WebSocket connections
5. All data models, API routes, business logic, and UI components remain unchanged

The abstraction boundary that makes this migration clean:

- **Server:** a `broadcastEvent(channel, event, data)` utility function (swap Pusher trigger for Redis publish)
- **Client:** a `useRealtimeSubscription(channel, event, callback)` hook (swap Pusher subscription for WebSocket listener)

Build both abstractions from day one so the transport is swappable without touching business logic.

---

## Push Notifications

### Browser notifications (web)

- Use the Web Push API with a Service Worker
- Request notification permission when the user first opens the messaging hub
- When a `new-message` event arrives on the user's private channel and the tab is not focused, show a browser notification
- Clicking the notification opens the relevant conversation or room
- Respect user opt-out preferences

### Mobile push notifications (native app)

- When native Android/iOS apps exist, use Firebase Cloud Messaging (FCM) for Android and Apple Push Notification Service (APNs) for iOS
- The server-side flow is: message persisted -> push notification sent to offline recipients via FCM/APNs
- Push notification payload includes: sender name, message preview, conversation/room ID for deep linking
- Requires a `PushSubscription` or `DeviceToken` model to track registered devices per user

### Notification preferences

Users should be able to control:

- DM notifications: on/off
- Room notifications: per-room (all messages, mentions only, muted)
- Organization thread notifications: on/off
- Quiet hours (optional, phase 2)

---

## Data Model Extensions

### New models

#### `Channel`

Represents a named room/channel within a community.

```
Channel
  id                String    @id @default(uuid())
  communityId       String    tenant scope
  name              String    display name
  slug              String    URL-safe, unique within community
  description       String?   purpose statement
  topic             String?   current topic
  visibility        String    PUBLIC | PRIVATE
  minTrustLevel     String    REGISTERED | TRUSTED (default REGISTERED)
  conversationId    String    links to existing Conversation for message storage
  createdByUserId   String    room creator
  isArchived        Boolean   soft archive
  maxMembers        Int?      optional capacity limit
  createdAt         DateTime
  updatedAt         DateTime

  @@unique([communityId, slug])
```

#### `ChannelMember`

Tracks room membership and roles separately from `ConversationParticipant`.

```
ChannelMember
  id              String    @id @default(uuid())
  channelId       String
  userId          String
  role            String    OWNER | MODERATOR | MEMBER
  joinedAt        DateTime
  lastReadAt      DateTime?
  isMuted         Boolean   user-controlled mute
  isBanned        Boolean   moderator action

  @@unique([channelId, userId])
```

#### `PushSubscription`

Tracks push notification registrations per user per device.

```
PushSubscription
  id              String    @id @default(uuid())
  userId          String
  platform        String    WEB | ANDROID | IOS
  endpoint        String    push endpoint or device token
  authKeys        Json?     web push auth keys
  isActive        Boolean
  createdAt       DateTime
  updatedAt       DateTime

  @@index([userId, platform])
```

#### `NotificationPreference`

Per-user notification settings.

```
NotificationPreference
  id              String    @id @default(uuid())
  userId          String
  dmNotifications Boolean   default true
  roomDefault     String    ALL | MENTIONS | MUTED (default ALL)
  orgNotifications Boolean  default true
  createdAt       DateTime
  updatedAt       DateTime

  @@unique([userId])
```

#### `ChannelNotificationOverride`

Per-user per-room notification override.

```
ChannelNotificationOverride
  id              String    @id @default(uuid())
  userId          String
  channelId       String
  level           String    ALL | MENTIONS | MUTED
  createdAt       DateTime

  @@unique([userId, channelId])
```

### Existing model changes

#### `Conversation`

Add optional `channelId` to link group conversations to their channel:

```
  channelId       String?   @unique
```

This preserves the existing `Conversation` -> `Message` flow for both DMs and rooms. A conversation without a `channelId` is a DM. A conversation with a `channelId` is a room's message store.

#### `Message`

No structural changes needed. Messages in rooms flow through the same `Message` table. The `conversationId` links to the channel's backing conversation.

Optional future additions:

- `isPinned` — for pinned room messages
- `isSystemMessage` — for join/leave/topic-change announcements
- `replyToMessageId` — for threaded replies (phase 2)

---

## API Surface

### Channel / Room APIs

```
GET    /api/channels                    Browse public channels for current community
GET    /api/channels/[id]               Channel details + member list
POST   /api/channels                    Create a new channel
PATCH  /api/channels/[id]               Edit channel settings (owner/moderator)
DELETE /api/channels/[id]               Archive/delete channel (owner)

POST   /api/channels/[id]/join          Join a public channel
POST   /api/channels/[id]/leave         Leave a channel
POST   /api/channels/[id]/members       Invite to private channel (owner/moderator)
DELETE /api/channels/[id]/members/[uid]  Remove member (moderator)
PATCH  /api/channels/[id]/members/[uid]  Update member role (owner)
```

### Extended message APIs

The existing `/api/messages` and `/api/messages/[conversationId]` routes continue to work for both DMs and room messages. Room messages use the channel's backing `conversationId`.

### Push notification APIs

```
POST   /api/push/subscribe              Register push subscription / device token
DELETE /api/push/subscribe              Unregister
GET    /api/notifications/preferences   Get notification preferences
PATCH  /api/notifications/preferences   Update notification preferences
PATCH  /api/notifications/preferences/channels/[id]  Per-room override
```

### Real-time auth

```
POST   /api/pusher/auth                 Authenticate private/presence channel subscriptions
```

Pusher requires a server-side auth endpoint for private and presence channels. This route validates that the requesting user has access to the conversation or room before allowing the subscription.

---

## UI Architecture

### Messaging hub: `/messages`

Two primary tabs:

- **Messages** — DM conversation list (current `ConversationList` component, upgraded with real-time)
- **Rooms** — joined rooms list + browse/discover

Each tab shows:

- Unread count badge on the tab itself
- List of conversations or rooms sorted by most recent activity
- Unread indicators per item
- Quick search/filter within the list

### DM thread view: `/messages/[conversationId]`

Existing `MessageThread` component with real-time upgrades:

- Messages appear instantly via Pusher subscription
- Typing indicator below the message list
- Online/presence dot on the conversation header (optional)
- Attachment upload and preview (existing)

### Room view: `/messages/rooms/[channelSlug]`

Similar to DM thread but with room-specific features:

- Room name, topic, and member count in the header
- Member list panel (collapsible sidebar or popover)
- Join/leave button for non-members browsing a public room
- Moderator actions: pin message, delete message, remove member
- System messages for join/leave/topic changes
- Per-room notification mute toggle

### Room browser: `/messages/rooms`

- Grid or list of public rooms in the current community
- Name, description, member count, last activity
- Search/filter
- Join button
- "Create Room" action for eligible users

### Shell integration

- Unread message count badge on the messages icon in the masthead/navigation
- Real-time badge updates via the user's private Pusher channel
- Badge reflects combined DM + room unread counts

---

## Mobile Native App Compatibility

### API compatibility

All messaging features are API-first. A native Android/iOS app calls the same REST endpoints:

- `GET /api/messages` — conversation list
- `POST /api/messages` — send DM
- `GET /api/channels` — room list
- `POST /api/channels/[id]/join` — join room
- `GET /api/messages/[conversationId]` — message thread (works for both DMs and rooms)
- `POST /api/messages/[conversationId]` — send message (works for both DMs and rooms)

### Real-time compatibility

Pusher provides native SDKs:

- **Android:** `com.pusher:pusher-java-client`
- **iOS:** `PusherSwift` (Swift) or `pusher-websocket-objc` (Objective-C)
- **Flutter/React Native:** corresponding community packages

The subscription model is identical: subscribe to conversation/room channels, bind to events, update local state. The auth endpoint (`/api/pusher/auth`) works the same way — the native app passes its auth token and Pusher validates.

### Push notification compatibility

- **Android:** Firebase Cloud Messaging (FCM) — standard for Android push
- **iOS:** Apple Push Notification Service (APNs) — standard for iOS push
- The `PushSubscription` model stores device tokens per platform
- Server-side notification dispatch checks which platforms a user has registered and sends accordingly

### Offline handling

Native apps should:

- Cache recent conversations and messages locally (SQLite or equivalent)
- Sync on app open via the standard API endpoints
- Use push notifications to trigger background sync
- Queue outbound messages when offline and send when connectivity returns

---

## Trust And Permissions

### DM permissions (existing, unchanged)

- Must be authenticated
- Must have `messages:access` and `messages:send` permissions
- Trust-gated composition (trusted-capable viewers can compose; others see guidance)
- Block enforcement prevents messaging between blocked users

### Room permissions

- **Browse public rooms:** any authenticated user
- **Join public room:** user meets the room's `minTrustLevel`
- **Send message in room:** active room member, not banned
- **Create room:** `TRUSTED` or higher (prevents spam room creation)
- **Moderate room:** room owner or moderator role
- **Create private room:** `TRUSTED` or higher
- **Invite to private room:** room owner or moderator

### Admin controls

- `SUPER_ADMIN` can view and moderate any room
- `/admin/channels` surface for community-wide room oversight (phase 2)
- Room archive/deletion by admin if needed

---

## Relationship To Organization Inbox

This plan and `ORGANIZATION-INBOX-CRM-PLAN.md` are complementary systems:

| Concern | Person-to-person / Rooms | Organization Inbox |
|---|---|---|
| Data models | `Conversation`, `Message`, `Channel` | `OrganizationInboxThread`, `OrganizationInboxMessage` |
| Participants | Individual users | Users + org mailboxes |
| Access model | Direct membership | Role-based mailbox access |
| History ownership | Belongs to participants | Belongs to organization |
| Staff continuity | N/A | Mailbox survives staff changes |
| Real-time transport | Shared Pusher/WS layer | Shared Pusher/WS layer |

The real-time broadcast abstraction (`broadcastEvent` / `useRealtimeSubscription`) is shared across both systems. Only the channel naming and auth rules differ.

---

## Moderation And Safety

### Room moderation

- Room moderators can delete individual messages
- Room moderators can remove or ban members
- Banned members cannot rejoin without moderator or admin action
- System messages announce moderation actions (optional)

### Platform-level moderation

- `SUPER_ADMIN` can archive or delete any room
- Activity logging for room creation, deletion, member removal, and message deletion
- Report mechanism for flagging messages or rooms (phase 2)

### Content rules

- Same message length limits as DMs (5000 characters)
- Same attachment policies as DMs
- No anonymous participation — all room messages are attributable to authenticated users

---

## Open Questions

To be resolved before implementation:

1. Should room creation be open to all `TRUSTED` users, or should it initially be staff/admin-only to control proliferation?
2. Should there be a maximum room count per community in early rollout?
3. Should private rooms be visible in the browse list (with a lock icon) or completely hidden?
4. Should the organization message tab exist in the messaging hub from day one, or only after the org inbox MVP ships?
5. Should presence/online indicators be opt-in given the small-community privacy dynamic?
6. Should room messages support threaded replies from day one, or is flat chronological sufficient for launch?
7. What is the right default set of seed rooms for a new community? (`General`, `Buy/Sell/Trade`, `Events`, `Help Wanted`?)

---

## Recommendation Summary

Build the IM system in layers:

1. Add `Channel` and room infrastructure on top of the existing `Conversation`/`Message` models
2. Integrate Pusher (or equivalent) as the real-time transport with a thin abstraction for future self-hosting
3. Upgrade the existing DM flow to real-time delivery
4. Build the rooms tab with browse, join/leave, and group messaging
5. Add browser push notifications
6. Design the mobile push pipeline for when native apps arrive
7. Keep organization messaging as a parallel track per `ORGANIZATION-INBOX-CRM-PLAN.md`, sharing only the real-time transport layer

The API-first architecture ensures that every feature built for the web client is automatically available to native Android and iOS apps through the same endpoints, with Pusher's native SDKs providing real-time parity across platforms.
