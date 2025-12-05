# nodejs-insta-private-api

This project implements a complete and production-ready MQTT protocol client for Instagram's real-time messaging infrastructure. Instagram uses MQTT natively for direct messages, notifications, and real-time presence updates. This library replicates that exact implementation, allowing developers to build high-performance bots and automation tools that communicate with Instagram's backend using the same protocol the official app uses.

By leveraging MQTT instead of Instagram's REST API, this library achieves sub-500ms message latency, bidirectional real-time communication, and native support for notifications, presence tracking, and thread management. The implementation is reverse-engineered from Instagram's mobile app protocol and tested extensively for reliability and compatibility.

## Features (v5.60.2 - Multi-File Session Persistence)

- **NEW: Multi-file auth state** - Session persistence like Baileys (WhatsApp library)
- Real-time MQTT messaging - Receive and send DMs with <500ms latency
- Bidirectional communication - Send messages back through the same MQTT connection
- Message management - Send, delete, edit, and reply to messages via MQTT
- Notification subscriptions - Follow, mention, and call notifications via MQTT
- Thread management - Add/remove members from groups via MQTT
- Auto-reply bots - Build keyword-triggered or scheduled response bots
- Session persistence - Avoid repeated logins with saved sessions
- Full Instagram API - Stories, media uploads, search, comments, user info
- Group chat support - Automatic detection with thread-based messaging
- IRIS subscription protocol - Reliable message delivery with compression
- Automatic reconnection - Exponential backoff with connection pooling
- Pure JavaScript - No compilation required, works in Node.js 18+

## Scope: DM-Focused Implementation

This library is optimized for Direct Messages and implements the core MQTT protocols used by Instagram for:
- Real-time message delivery and reception
- Presence status tracking
- Typing indicators
- Notifications for follows, mentions, and calls
- Group thread management

**For full MQTT coverage analysis, see [MQTT_COVERAGE_ANALYSIS.md](MQTT_COVERAGE_ANALYSIS.md)**

## Installation

```bash
npm install nodejs-insta-private-api
```

Requires **Node.js 18 or higher**.

---

## NEW: useMultiFileAuthState (v5.60.2)

This feature provides **Baileys-style multi-file session persistence** for Instagram. Instead of storing everything in a single `session.json`, the session is split across multiple files for better organization, security, and reliability.

### Session Files Structure

```
auth_info_instagram/
├── creds.json          # Authorization tokens (Bearer token, claims)
├── device.json         # Device information (device ID, UUID, phone ID)
├── cookies.json        # HTTP cookies for API requests
├── mqtt-session.json   # MQTT real-time session data
├── subscriptions.json  # GraphQL and Skywalker subscriptions
├── seq-ids.json        # Sequence IDs for message sync
└── app-state.json      # Application state and preferences
```

### Basic Usage

```javascript
const { IgApiClient, RealtimeClient, useMultiFileAuthState } = require('nodejs-insta-private-api');

async function main() {
  // Initialize multi-file auth state
  const authState = await useMultiFileAuthState('./auth_info_instagram');
  
  const ig = new IgApiClient();

  // Check if we have a saved session
  if (authState.hasSession()) {
    console.log('Loading saved session...');
    
    // Load credentials from files
    await authState.loadCreds(ig);
    
    // Validate session with Instagram
    const isValid = await authState.isSessionValid(ig);
    
    if (isValid) {
      console.log('Session valid! Connecting to MQTT...');
      
      // Connect using saved MQTT session
      const realtime = new RealtimeClient(ig);
      await realtime.connectFromSavedSession(authState);
      
      realtime.on('message', (data) => {
        console.log('New DM:', data.message.text);
      });
      
      console.log('Bot is running!');
    } else {
      console.log('Session expired, need fresh login');
      await freshLogin(ig, authState);
    }
  } else {
    console.log('No session found, logging in...');
    await freshLogin(ig, authState);
  }
}

async function freshLogin(ig, authState) {
  // Login with credentials
  await ig.login({
    username: 'your_username',
    password: 'your_password'
  });
  
  // Save credentials to files
  await authState.saveCreds(ig);
  console.log('Credentials saved!');
  
  // Connect to MQTT
  const realtime = new RealtimeClient(ig);
  const inbox = await ig.direct.getInbox();
  
  await realtime.connect({
    graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
    skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
    irisData: inbox
  });
  
  // Save MQTT session
  await authState.saveMqttSession(realtime);
  console.log('MQTT session saved!');
  
  realtime.on('message', (data) => {
    console.log('New DM:', data.message.text);
  });
}

main();
```

### API Reference: useMultiFileAuthState

```javascript
const authState = await useMultiFileAuthState(folderPath);
```

#### Methods

| Method | Description |
|--------|-------------|
| `hasSession()` | Returns `true` if saved credentials exist |
| `hasMqttSession()` | Returns `true` if saved MQTT session exists |
| `loadCreds(ig)` | Loads saved credentials into IgApiClient |
| `saveCreds(ig)` | Saves current credentials to files |
| `isSessionValid(ig)` | Validates session with Instagram API |
| `loadMqttSession()` | Returns saved MQTT session data |
| `saveMqttSession(realtime)` | Saves MQTT session from RealtimeClient |
| `clearSession()` | Deletes all saved session files |

### Complete Example: Bot with Auto-Reconnect

```javascript
const { IgApiClient, RealtimeClient, useMultiFileAuthState } = require('nodejs-insta-private-api');

const AUTH_FOLDER = './auth_info_instagram';
const USERNAME = process.env.IG_USERNAME;
const PASSWORD = process.env.IG_PASSWORD;

async function startBot() {
  console.log('Starting Instagram Bot...');
  
  const authState = await useMultiFileAuthState(AUTH_FOLDER);
  const ig = new IgApiClient();
  let realtime;

  if (authState.hasSession()) {
    console.log('Found saved session, attempting to restore...');
    
    const loaded = await authState.loadCreds(ig);
    if (loaded) {
      const valid = await authState.isSessionValid(ig);
      
      if (valid) {
        console.log('Session is valid! Connecting to MQTT...');
        realtime = new RealtimeClient(ig);
        
        realtime.on('connected', () => console.log('MQTT Connected!'));
        realtime.on('error', (err) => console.error('MQTT Error:', err.message));
        
        await realtime.connectFromSavedSession(authState);
        
        setupMessageHandler(realtime);
        console.log('Bot is now listening for messages!');
        return;
      }
    }
    
    console.log('Session invalid or expired, clearing...');
    await authState.clearSession();
  }

  // Fresh login required
  console.log('Performing fresh login...');
  
  await ig.login({ username: USERNAME, password: PASSWORD });
  console.log('Login successful!');
  
  await authState.saveCreds(ig);
  
  realtime = new RealtimeClient(ig);
  const inbox = await ig.direct.getInbox();
  
  await realtime.connect({
    graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
    skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
    irisData: inbox
  });
  
  await authState.saveMqttSession(realtime);
  
  setupMessageHandler(realtime);
  console.log('Bot is now listening for messages!');
}

function setupMessageHandler(realtime) {
  realtime.on('message', async (data) => {
    const msg = data.message;
    if (!msg?.text) return;
    
    console.log(`New message from ${msg.from_user_id}: ${msg.text}`);
    
    // Auto-reply example
    if (msg.text.toLowerCase().includes('hello')) {
      await realtime.directCommands.sendTextViaRealtime(
        msg.thread_id,
        'Hi there! Thanks for your message!'
      );
    }
  });
}

startBot().catch(console.error);
```

---

## Quick Start (Traditional Method)

### Step 1: Login and Save Session

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');
const fs = require('fs');

const ig = new IgApiClient();

// Login
await ig.login({
  username: 'your_instagram_username',
  password: 'your_instagram_password',
  email: 'your_email@example.com'
});

// Save session for future use (persists authentication)
fs.writeFileSync('session.json', JSON.stringify(ig.state.serialize(), null, 2));
console.log('Session saved to session.json');
```

### Step 2: Load Session and Start Listening

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');
const fs = require('fs');

const ig = new IgApiClient();

// Load saved session
const session = JSON.parse(fs.readFileSync('session.json'));
await ig.state.deserialize(session);

// Create real-time client
const realtime = new RealtimeClient(ig);

// Fetch inbox (required for MQTT subscription)
const inbox = await ig.direct.getInbox();

// Connect to Instagram's MQTT broker
await realtime.connect({
  graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
  skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
  irisData: inbox
});

console.log('Connected! Listening for messages...');

// Messages arrive in real-time
realtime.on('message', (data) => {
  const msg = data.message;
  console.log(`DM from ${msg.from_user_id}: ${msg.text}`);
});
```

---

## All 18 MQTT Methods - Complete Reference

### Messaging Methods (Send, Edit, Delete, Reply)

#### 1. Send Text Message

```javascript
await realtime.directCommands.sendTextViaRealtime(threadId, 'Your message here');
```

#### 2. Delete Message

```javascript
await realtime.directCommands.deleteMessage(threadId, messageId);
```

#### 3. Edit Message

```javascript
await realtime.directCommands.editMessage(threadId, messageId, 'Updated text');
```

#### 4. Reply to Message (Quote Reply)

```javascript
await realtime.directCommands.replyToMessage(threadId, messageId, 'My reply');
```

#### 5. Send Reaction (Emoji)

```javascript
await realtime.directCommands.sendReaction({
  threadId: threadId,
  itemId: messageId,
  emoji: '❤️',
  reactionType: 'like',
  reactionStatus: 'created'
});

// Remove reaction
await realtime.directCommands.sendReaction({
  threadId: threadId,
  itemId: messageId,
  emoji: '❤️',
  reactionStatus: 'deleted'
});
```

### Content Sending Methods (Media, Location, Profile, etc)

#### 6. Send Media (Image/Video)

```javascript
await realtime.directCommands.sendMedia({
  threadId: threadId,
  mediaId: '12345678',
  text: 'Optional caption'
});
```

#### 7. Send Location

```javascript
await realtime.directCommands.sendLocation({
  threadId: threadId,
  locationId: '213999449',
  text: 'Optional description'
});
```

#### 8. Send Profile

```javascript
await realtime.directCommands.sendProfile({
  threadId: threadId,
  userId: '987654321',
  text: 'Optional text'
});
```

#### 9. Send Hashtag

```javascript
await realtime.directCommands.sendHashtag({
  threadId: threadId,
  hashtag: 'instagram',
  text: 'Optional text'
});
```

#### 10. Send Like

```javascript
await realtime.directCommands.sendLike({ threadId: threadId });
```

#### 11. Send User Story

```javascript
await realtime.directCommands.sendUserStory({
  threadId: threadId,
  storyId: 'story_12345',
  text: 'Optional text'
});
```

### Status Methods (Typing, Read Receipts)

#### 12. Mark Message as Seen

```javascript
await realtime.directCommands.markAsSeen({
  threadId: threadId,
  itemId: messageId
});
```

#### 13. Indicate Activity (Typing Indicator)

```javascript
// Show typing indicator
await realtime.directCommands.indicateActivity({
  threadId: threadId,
  isActive: true
});

// Stop typing
await realtime.directCommands.indicateActivity({
  threadId: threadId,
  isActive: false
});
```

### Notification Subscription Methods

#### 14. Subscribe to Follow Notifications

```javascript
await realtime.directCommands.subscribeToFollowNotifications();

realtime.on('follow', (data) => {
  console.log('New follower:', data.user_id);
});
```

#### 15. Subscribe to Mention Notifications

```javascript
await realtime.directCommands.subscribeToMentionNotifications();

realtime.on('mention', (data) => {
  console.log('You were mentioned in:', data.content_type);
});
```

#### 16. Subscribe to Call Notifications

```javascript
await realtime.directCommands.subscribeToCallNotifications();

realtime.on('call', (data) => {
  console.log('Incoming call from:', data.caller_id);
});
```

### Group Management Methods

#### 17. Add Member to Thread

```javascript
await realtime.directCommands.addMemberToThread(threadId, userId);
```

#### 18. Remove Member from Thread

```javascript
await realtime.directCommands.removeMemberFromThread(threadId, userId);
```

---

## Building Instagram Bots

### Example 1: Auto-Reply Bot (Keyword Triggered)

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');
const fs = require('fs');

(async () => {
  const ig = new IgApiClient();
  const session = JSON.parse(fs.readFileSync('session.json'));
  await ig.state.deserialize(session);

  const realtime = new RealtimeClient(ig);
  const inbox = await ig.direct.getInbox();
  
  await realtime.connect({
    graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
    skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
    irisData: inbox
  });

  console.log('Auto-Reply Bot Active\n');

  realtime.on('message', async (data) => {
    const msg = data.message;
    if (!msg?.text) return;

    console.log(`[${msg.from_user_id}]: ${msg.text}`);

    let reply = null;

    if (msg.text.toLowerCase().includes('hello')) {
      reply = 'Hey! Thanks for reaching out!';
    } else if (msg.text.toLowerCase().includes('help')) {
      reply = 'How can I assist you?';
    } else if (msg.text.toLowerCase().includes('thanks')) {
      reply = 'You are welcome!';
    }

    if (reply) {
      try {
        await realtime.directCommands.sendTextViaRealtime(msg.thread_id, reply);
        console.log(`Replied: ${reply}\n`);
      } catch (err) {
        console.error(`Failed to send reply: ${err.message}\n`);
      }
    }
  });

  await new Promise(() => {});
})();
```

### Example 2: Smart Bot with Reactions and Typing

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');
const fs = require('fs');

(async () => {
  const ig = new IgApiClient();
  const session = JSON.parse(fs.readFileSync('session.json'));
  await ig.state.deserialize(session);

  const realtime = new RealtimeClient(ig);
  const inbox = await ig.direct.getInbox();
  
  await realtime.connect({
    graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
    skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
    irisData: inbox
  });

  console.log('Smart Bot Started\n');

  realtime.on('message', async (data) => {
    const msg = data.message;
    if (!msg?.text) return;

    // Mark as seen immediately
    await realtime.directCommands.markAsSeen({
      threadId: msg.thread_id,
      itemId: msg.item_id
    });

    // Show typing indicator
    await realtime.directCommands.indicateActivity({
      threadId: msg.thread_id,
      isActive: true
    });

    // Simulate processing time
    await new Promise(r => setTimeout(r, 2000));

    // Send reply
    if (msg.text.toLowerCase().includes('hi')) {
      await realtime.directCommands.sendTextViaRealtime(
        msg.thread_id,
        'Hello there! How can I help?'
      );

      // React with emoji
      await realtime.directCommands.sendReaction({
        threadId: msg.thread_id,
        itemId: msg.item_id,
        emoji: '👋'
      });
    }

    // Stop typing
    await realtime.directCommands.indicateActivity({
      threadId: msg.thread_id,
      isActive: false
    });
  });

  await new Promise(() => {});
})();
```

---

## API Reference

### IgApiClient

#### Authentication

```javascript
// Login with credentials
await ig.login({
  username: 'your_username',
  password: 'your_password',
  email: 'your_email@example.com'
});

// Load from saved session
const session = JSON.parse(fs.readFileSync('session.json'));
await ig.state.deserialize(session);

// Save session
const serialized = ig.state.serialize();
fs.writeFileSync('session.json', JSON.stringify(serialized));
```

#### Direct Messages

```javascript
// Get inbox with all conversations
const inbox = await ig.direct.getInbox();

// Get specific thread messages
const thread = await ig.direct.getThread(threadId);

// Send text message (HTTP - slower than MQTT)
await ig.direct.send({
  threadId: threadId,
  item: {
    type: 'text',
    text: 'Hello there!'
  }
});

// Mark messages as seen
await ig.direct.markMessagesSeen(threadId, [messageId]);
```

### RealtimeClient

#### Connection

```javascript
const realtime = new RealtimeClient(ig);

// Connect to MQTT
await realtime.connect({
  graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
  skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
  irisData: inbox  // Required: inbox data from ig.direct.getInbox()
});

// Connect from saved session (NEW in v5.60.2)
await realtime.connectFromSavedSession(authState);
```

#### All 18 MQTT Methods via directCommands

```javascript
// 1. Send Text
await realtime.directCommands.sendTextViaRealtime(threadId, 'Text');

// 2. Delete Message
await realtime.directCommands.deleteMessage(threadId, messageId);

// 3. Edit Message
await realtime.directCommands.editMessage(threadId, messageId, 'New text');

// 4. Reply to Message
await realtime.directCommands.replyToMessage(threadId, messageId, 'Reply');

// 5. Send Reaction
await realtime.directCommands.sendReaction({
  threadId, itemId, emoji: '❤️'
});

// 6. Send Media
await realtime.directCommands.sendMedia({ threadId, mediaId });

// 7. Send Location
await realtime.directCommands.sendLocation({ threadId, locationId });

// 8. Send Profile
await realtime.directCommands.sendProfile({ threadId, userId });

// 9. Send Hashtag
await realtime.directCommands.sendHashtag({ threadId, hashtag });

// 10. Send Like
await realtime.directCommands.sendLike({ threadId });

// 11. Send Story
await realtime.directCommands.sendUserStory({ threadId, storyId });

// 12. Mark as Seen
await realtime.directCommands.markAsSeen({ threadId, itemId });

// 13. Indicate Activity (Typing)
await realtime.directCommands.indicateActivity({ threadId, isActive: true });

// 14. Subscribe to Follow Notifications
await realtime.directCommands.subscribeToFollowNotifications();

// 15. Subscribe to Mention Notifications
await realtime.directCommands.subscribeToMentionNotifications();

// 16. Subscribe to Call Notifications
await realtime.directCommands.subscribeToCallNotifications();

// 17. Add Member to Thread
await realtime.directCommands.addMemberToThread(threadId, userId);

// 18. Remove Member from Thread
await realtime.directCommands.removeMemberFromThread(threadId, userId);
```

#### Listening for Events

```javascript
// Incoming messages
realtime.on('message', (data) => {
  const msg = data.message;
  console.log(msg.text);           // Message text
  console.log(msg.from_user_id);   // Sender user ID
  console.log(msg.thread_id);      // Conversation thread ID
});

// Connection status
realtime.on('connected', () => console.log('Connected'));
realtime.on('disconnected', () => console.log('Disconnected'));

// Notifications
realtime.on('follow', (data) => console.log('New follower:', data.user_id));
realtime.on('mention', (data) => console.log('Mentioned:', data.content_type));
realtime.on('call', (data) => console.log('Call from:', data.caller_id));

// Errors
realtime.on('error', (err) => console.error('Error:', err.message));
```

### User Information

```javascript
// Get user info by username
const user = await ig.user.info('username');

// Search users
const results = await ig.user.search({ username: 'query' });

// Get followers
const followers = await ig.user.followers('user_id');

// Get following
const following = await ig.user.following('user_id');
```

---

## Message Structure

Messages arrive as event data with this structure:

```javascript
realtime.on('message', (data) => {
  const msg = data.message;
  
  console.log({
    text: msg.text,                // Message content (string)
    from_user_id: msg.from_user_id,  // Sender's Instagram user ID
    thread_id: msg.thread_id,      // Conversation thread ID
    timestamp: msg.timestamp,      // Unix timestamp
    item_id: msg.item_id           // Unique message ID
  });
});
```

---

## Performance & Latency

| Operation | Latency | Method |
|-----------|---------|--------|
| Receive incoming DM | 100-500ms | MQTT (real-time) |
| Send DM via MQTT | 200-800ms | Direct MQTT publish |
| Send DM via HTTP | 1-3s | REST API fallback |
| Get inbox | 500ms-2s | REST API |

MQTT is significantly faster for both receiving and sending messages.

---

## Best Practices

### 1. Session Management (Recommended: useMultiFileAuthState)

```javascript
// NEW: Use multi-file auth state for better session management
const authState = await useMultiFileAuthState('./auth_info_instagram');

// Check and load existing session
if (authState.hasSession()) {
  await authState.loadCreds(ig);
  if (await authState.isSessionValid(ig)) {
    // Session is valid, proceed
  }
}

// Save after login
await authState.saveCreds(ig);
await authState.saveMqttSession(realtime);
```

### 2. Error Handling

```javascript
realtime.on('message', async (data) => {
  try {
    const msg = data.message;
    await realtime.directCommands.sendTextViaRealtime(msg.thread_id, 'Reply');
  } catch (err) {
    console.error('Error:', err.message);
  }
});
```

### 3. Rate Limiting

```javascript
const userLastSeen = new Map();

if (userLastSeen.has(userId) && Date.now() - userLastSeen.get(userId) < 5000) {
  return;
}
userLastSeen.set(userId, Date.now());
```

### 4. Connection Monitoring

```javascript
let isConnected = false;

realtime.on('connected', () => {
  isConnected = true;
  console.log('Connected');
});

realtime.on('disconnected', () => {
  isConnected = false;
  console.log('Disconnected - will auto-reconnect');
});
```

---

## Limitations

- Instagram account required - No API tokens needed, use your credentials
- Rate limiting - Instagram rate limits automated messaging, implement delays
- Mobile detection - Instagram may detect bot activity and require verification
- Session expiry - Sessions may expire after 60+ days, require re-login
- Message history - Only real-time messages available, no historical message sync

---

## Troubleshooting

### Login Fails

```javascript
// Ensure credentials are correct
// Instagram may require 2FA verification
```

### MQTT Connection Fails

```javascript
// Check that inbox data is loaded before connecting
const inbox = await ig.direct.getInbox();

// Connection retries automatically with exponential backoff
```

### Messages Not Sending

```javascript
// Ensure MQTT is connected
if (!isConnected) {
  console.log('Waiting for MQTT connection...');
  return;
}

// Check rate limiting - Instagram blocks rapid messaging
```

---

## Changelog

### v5.60.2
- Added `useMultiFileAuthState()` - Baileys-style multi-file session persistence
- Added `connectFromSavedSession()` method for RealtimeClient
- Session now persists both HTTP auth and MQTT real-time data
- 7 separate files for better organization and security

### v5.60.1
- Fixed MQTT message sync issues
- Improved connection stability

### v5.60.0
- Full MQTT integration with 18 methods
- Real-time messaging with <500ms latency

---

## License

MIT

## Support

For issues, bugs, or feature requests: https://github.com/Kunboruto20/nodejs-insta-private-api/issues

Documentation: https://github.com/Kunboruto20/nodejs-insta-private-api

Examples: See repository examples/ directory for working implementations
