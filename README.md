# nodejs-insta-private-api

A complete JavaScript/Node.js client for Instagram's private API with **native real-time MQTT messaging**. Get direct messages, typing indicators, and presence updates instantly without polling.

This library talks directly to Instagram's backend servers using their undocumented private API endpoints and MQTT protocol. It's the real deal—no wrappers, no simulators, just pure access to what the official Instagram app uses.

## What You Get

- **Complete API Access** - All of Instagram's private endpoints (users, posts, stories, direct messages, search, etc.)
- **Real-Time MQTT** - Connect to Instagram's MQTT broker and receive messages instantly as they happen
- **Session Management** - Login once, save your session, use it forever (or until Instagram blocks it)
- **Automatic Retries** - Built-in handling for rate limits and transient failures
- **Media Support** - Upload photos, videos, audio files with full control
- **Zero External MQTT Dependencies** - Everything is built-in, no separate MQTT library needed
- **Pure JavaScript** - Works in Node.js 18+, no compilation required

## Fair Warning ⚠️

Reverse engineering Instagram is genuinely difficult. Instagram's API changes without notice, their security measures are sophisticated, and using this library could get your account flagged or banned if you're not careful. **Use a test account for development.**

**Any pull request to fix bugs or add features is welcome and appreciated.** If you find something broken, please open an issue or contribute a fix. This is a community effort.

## Installation

```bash
npm install nodejs-insta-private-api
```

Requires Node.js 18 or higher.

## Quick Start

### 1. Basic Login

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');

const ig = new IgApiClient();

await ig.login({
  username: 'your_instagram_username',
  password: 'your_password',
  email: 'your_email@example.com'
});

console.log('Logged in!');
```

### 2. Listen for Direct Messages in Real-Time

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

const ig = new IgApiClient();
await ig.login({
  username: 'your_username',
  password: 'your_password',
  email: 'your_email@example.com'
});

// Set up real-time listener
const realtime = new RealtimeClient(ig);

realtime.on('connected', () => {
  console.log('Connected to Instagram MQTT broker');
});

realtime.on('receive', (topic, messages) => {
  messages.forEach(msg => {
    console.log(`Message from ${msg.from_user_id}: ${msg.body}`);
  });
});

await realtime.connect({
  graphQlSubs: ['ig_sub_direct'],
  irisData: null
});

// Now send yourself a message on Instagram—it'll appear instantly here
```

That's it. Real-time messaging with just a few lines of code.

---

## MQTT Real-Time Messaging Guide

This is where the library gets powerful. MQTT (Message Queuing Telemetry Transport) lets you receive updates the moment they happen on Instagram—direct messages, typing indicators, presence, everything.

### How It Works

When you call `realtime.connect()`, the library:
1. Authenticates to Instagram's MQTT broker (`edge-mqtt.facebook.com`)
2. Subscribes to topics you specify
3. Starts receiving real-time events immediately
4. Emits them as JavaScript events for you to handle

No polling, no delay. Just instant updates from Instagram's servers.

### Real-Time Event Types

The library emits different events for different types of messages:

#### `message` Event - Direct Messages (Most Common)
Real direct messages from threads:
```javascript
realtime.on('message', (msg) => {
  if (msg.message && msg.message.items) {
    msg.message.items.forEach(item => {
      if (item.text) {
        console.log(`DM: ${item.text}`);
      }
    });
  }
});
```

#### `direct` Event - Realtime Direct Messages
Alternative DM source from GraphQL subscriptions:
```javascript
realtime.on('direct', (data) => {
  const value = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  if (value.text) {
    console.log(`Direct: ${value.text}`);
  }
});
```

#### `threadUpdate` Event - Group Chat & Thread Changes
When threads are updated (new members, name changes, etc.):
```javascript
realtime.on('threadUpdate', (data) => {
  console.log(`Thread ${data.meta.thread_id} updated`);
  console.log(`Operation: ${data.meta.op}`);
  if (data.update.name) {
    console.log(`New name: ${data.update.name}`);
  }
});
```

#### `iris` Event - Message Sync Data
Low-level message sync events:
```javascript
realtime.on('iris', (data) => {
  console.log('Iris sync event', data);
});
```

#### `realtimeSub` Event - GraphQL Subscriptions
Real-time GraphQL subscription updates:
```javascript
realtime.on('realtimeSub', (data) => {
  console.log('Realtime update', data);
});
```

### Complete MQTT Example - Receive All Messages

Here's a production-ready example that handles everything:

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');
const fs = require('fs');

async function main() {
  const ig = new IgApiClient();
  
  // Load saved session or login fresh
  const sessionFile = 'instagram-session.json';
  
  if (fs.existsSync(sessionFile)) {
    console.log('Using saved session...');
    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    await ig.loadSession(session);
  } else {
    console.log('Logging in...');
    await ig.login({
      username: process.env.INSTAGRAM_USERNAME,
      password: process.env.INSTAGRAM_PASSWORD,
      email: process.env.INSTAGRAM_EMAIL
    });
    
    // Save session for next time
    const session = await ig.saveSession();
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
    console.log('Session saved.');
  }
  
  console.log(`Logged in as @${process.env.INSTAGRAM_USERNAME}\n`);
  
  // Set up real-time listener
  const realtime = new RealtimeClient(ig);
  
  // When MQTT connects successfully
  realtime.on('connected', () => {
    console.log('✓ Connected to Instagram real-time');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Listening for incoming messages...\n');
  });
  
  // Receive messages
  realtime.on('receive', (topic, messages) => {
    messages.forEach(msg => {
      const time = new Date().toLocaleTimeString();
      
      // Text message
      if (msg.body) {
        console.log(`[${time}] 💬 Message from ${msg.from_user_id}:`);
        console.log(`    "${msg.body}"\n`);
      }
      
      // Typing indicator
      if (msg.is_typing) {
        console.log(`[${time}] ✏️  ${msg.from_user_id} is typing...\n`);
      }
      
      // Presence (online/offline)
      if (msg.presence_status) {
        console.log(`[${time}] 🟢 ${msg.from_user_id} is ${msg.presence_status}\n`);
      }
    });
  });
  
  // Handle errors
  realtime.on('error', (error) => {
    console.error('❌ MQTT Error:', error.message);
  });
  
  realtime.on('disconnect', () => {
    console.log('⚠️ Disconnected from MQTT');
  });
  
  // Connect to MQTT
  console.log('Connecting to Instagram...\n');
  
  await realtime.connect({
    // Subscribe to direct messages
    graphQlSubs: ['ig_sub_direct', 'ig_sub_iris'],
    irisData: null
  });
  
  // Keep the process running
  console.log('Press Ctrl+C to stop.\n');
  await new Promise(() => {});
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

Run it:

```bash
export INSTAGRAM_USERNAME="your_username"
export INSTAGRAM_PASSWORD="your_password"
export INSTAGRAM_EMAIL="your_email@example.com"

node realtime-listener.js
```

Now send yourself a direct message on Instagram. Watch it appear instantly in your terminal. That's MQTT in action.

### Sending Direct Messages

You can send messages while listening for responses. Here's how:

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

async function sendAndListen() {
  const ig = new IgApiClient();
  await ig.login({
    username: 'your_username',
    password: 'your_password',
    email: 'your_email@example.com'
  });
  
  // Get a user by username
  const user = await ig.user.getByUsername('target_username');
  console.log(`Found user: @${user.username}`);
  
  // Get their DM thread
  const thread = await ig.direct.getThread(user.id);
  
  // Send a message
  const result = await thread.sendMessage({
    text: 'Hey! This message was sent via nodejs-insta-private-api.'
  });
  
  console.log('Message sent!');
  
  // Now listen for their reply in real-time
  const realtime = new RealtimeClient(ig);
  
  realtime.on('message', (msg) => {
    if (msg.message && msg.message.items) {
      msg.message.items.forEach(item => {
        if (item.text) {
          console.log(`${user.username} replied: ${item.text}`);
        }
      });
    }
  });
  
  await realtime.connect({
    graphQlSubs: ['ig_sub_direct'],
    irisData: null
  });
  
  console.log('Listening for replies... (Press Ctrl+C to stop)');
}

sendAndListen().catch(console.error);
```

### Sending Messages to Multiple Users (Broadcasts)

Want to send the same message to a group? Use broadcasts:

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');

async function broadcastMessage() {
  const ig = new IgApiClient();
  await ig.login({
    username: 'your_username',
    password: 'your_password',
    email: 'your_email@example.com'
  });
  
  // Get user IDs for people you want to message
  const user1 = await ig.user.getByUsername('friend1');
  const user2 = await ig.user.getByUsername('friend2');
  
  // Send the same message to both
  const result = await ig.directThread.broadcast({
    userIds: [user1.id, user2.id],
    item: 'text',
    form: { text: 'Hey everyone!' },
    signed: true
  });
  
  console.log('Broadcast sent to:', result.recipient_count, 'users');
}

broadcastMessage().catch(console.error);
```

### Group Chats & Multiple Threads

Work with group conversations:

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');

async function getGroupChats() {
  const ig = new IgApiClient();
  await ig.login({
    username: 'your_username',
    password: 'your_password',
    email: 'your_email@example.com'
  });
  
  // Get all conversations
  const inbox = await ig.direct.getInbox();
  
  // Filter for group chats
  inbox.threads.forEach(thread => {
    if (thread.users.length > 1) {
      console.log(`Group: ${thread.name || 'Unnamed'}`);
      console.log(`Members: ${thread.users.map(u => u.username).join(', ')}`);
      console.log(`Last message: ${thread.last_permanent_item?.text}\n`);
    }
  });
}

getGroupChats().catch(console.error);
```

Send a message to a group:

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');

async function sendGroupMessage() {
  const ig = new IgApiClient();
  await ig.login({
    username: 'your_username',
    password: 'your_password',
    email: 'your_email@example.com'
  });
  
  // Get the group thread
  const inbox = await ig.direct.getInbox();
  const groupThread = inbox.threads.find(t => t.name === 'My Group');
  
  if (groupThread) {
    await groupThread.sendMessage({
      text: 'Hey group! This is from the API.'
    });
    
    console.log('Message sent to group!');
  }
}

sendGroupMessage().catch(console.error);
```

---

### Advanced MQTT Usage

#### Listen to Multiple Event Types at Once

Here's a real-world example that handles everything:

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

async function advancedListener() {
  const ig = new IgApiClient();
  await ig.login({
    username: 'your_username',
    password: 'your_password',
    email: 'your_email@example.com'
  });
  
  const realtime = new RealtimeClient(ig);
  
  // Track who's typing
  const typingUsers = new Set();
  
  // Handle connection
  realtime.on('connected', () => {
    console.log('✓ Real-time connection established\n');
  });
  
  // Handle incoming messages
  realtime.on('message', (msg) => {
    if (msg.message && msg.message.items) {
      msg.message.items.forEach(item => {
        if (item.text) {
          console.log(`📬 Message from ${item.user_id}: "${item.text}"`);
        }
        if (item.media) {
          console.log(`📬 ${item.user_id} sent media: ${item.media.type}`);
        }
      });
    }
  });
  
  // Handle typing indicators
  realtime.on('receive', (topic, messages) => {
    messages.forEach(msg => {
      if (msg.is_typing) {
        typingUsers.add(msg.from_user_id);
        console.log(`✏️  ${msg.from_user_id} is typing...`);
        
        // Remove from typing after 5 seconds
        setTimeout(() => {
          typingUsers.delete(msg.from_user_id);
        }, 5000);
      }
    });
  });
  
  // Handle online status
  realtime.on('receive', (topic, messages) => {
    messages.forEach(msg => {
      if (msg.presence_status) {
        console.log(`🟢 ${msg.from_user_id} is ${msg.presence_status}`);
      }
    });
  });
  
  // Handle errors gracefully
  realtime.on('error', (error) => {
    console.error('⚠️ MQTT Error:', error.message);
  });
  
  realtime.on('disconnect', () => {
    console.log('⚠️ Disconnected (will auto-reconnect)');
  });
  
  // Connect
  await realtime.connect({
    graphQlSubs: ['ig_sub_direct', 'ig_sub_iris'],
    irisData: null
  });
  
  console.log('Listening...\n');
  
  // Keep running
  await new Promise(() => {});
}

advancedListener().catch(console.error);
```

#### Reconnect on Disconnect

By default, the library auto-reconnects. But you can handle it manually if you need to:

```javascript
const realtime = new RealtimeClient(ig);

realtime.on('disconnect', async () => {
  console.log('Disconnected, reconnecting...');
  
  // Wait a bit before reconnecting
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    await realtime.connect({
      graphQlSubs: ['ig_sub_direct'],
      irisData: null
    });
    console.log('Reconnected!');
  } catch (error) {
    console.error('Reconnect failed:', error.message);
  }
});

await realtime.connect({
  graphQlSubs: ['ig_sub_direct'],
  irisData: null
});
```

### MQTT Event Types

The `receive` event gives you access to different message types:

#### Direct Messages
```javascript
realtime.on('receive', (topic, messages) => {
  messages.forEach(msg => {
    // Text message
    if (msg.body) {
      console.log(`Text: ${msg.body}`);
    }
    
    // Media (photo/video)
    if (msg.media) {
      console.log(`Media: ${msg.media.type}`);
    }
    
    // Link preview
    if (msg.link) {
      console.log(`Link: ${msg.link.url}`);
    }
  });
});
```

#### Typing Indicators
```javascript
realtime.on('receive', (topic, messages) => {
  messages.forEach(msg => {
    if (msg.is_typing) {
      console.log(`${msg.from_user_id} is typing...`);
    }
  });
});
```

#### Presence (Online Status)
```javascript
realtime.on('receive', (topic, messages) => {
  messages.forEach(msg => {
    if (msg.presence_status) {
      console.log(`${msg.from_user_id} is now ${msg.presence_status}`);
    }
  });
});
```

#### Notifications (Likes, Comments, Follows)
```javascript
realtime.on('receive', (topic, messages) => {
  messages.forEach(msg => {
    if (msg.notification_type === 'like') {
      console.log(`${msg.from_user_id} liked your post`);
    }
    if (msg.notification_type === 'comment') {
      console.log(`${msg.from_user_id} commented: ${msg.comment_text}`);
    }
    if (msg.notification_type === 'follow') {
      console.log(`${msg.from_user_id} started following you`);
    }
  });
});
```

### Connection Options

When calling `realtime.connect()`, you can pass options:

```javascript
await realtime.connect({
  // Which topics to subscribe to
  graphQlSubs: [
    'ig_sub_direct',          // Direct messages
    'ig_sub_iris',            // Message sync
    'ig_sub_graphql',         // GraphQL updates
    'ig_sub_presence',        // Online status
    'ig_sub_notification'     // Notifications (likes, comments, follows)
  ],
  
  // Message sync data (usually null)
  irisData: null,
  
  // Enable detailed logging
  enableTrace: false,
  
  // Auto-reconnect if disconnected
  autoReconnect: true,
  
  // Override TLS options if needed
  additionalTlsOptions: {}
});
```

---

## API Methods Reference

### User Operations

```javascript
// Get a user by username
const user = await ig.user.getByUsername('username');
console.log(user.id, user.username, user.full_name);

// Get user info by ID
const info = await ig.user.info(userId);

// Search for users
const results = await ig.user.search({ username: 'instagram' });

// Get user's followers
const followers = await ig.user.getFollowers(userId);

// Get user's following list
const following = await ig.user.getFollowing(userId);

// Follow a user
await ig.user.follow(userId);

// Unfollow a user
await ig.user.unfollow(userId);

// Block a user
await ig.user.block(userId);

// Unblock a user
await ig.user.unblock(userId);
```

### Direct Messages

```javascript
// Get inbox (all conversation threads)
const inbox = await ig.direct.getInbox();
inbox.threads.forEach(thread => {
  console.log(`Thread with ${thread.user.username}: ${thread.last_permanent_item?.text}`);
});

// Get a specific conversation
const thread = await ig.direct.getThread(userId);

// Send a text message
await thread.sendMessage({
  text: 'Hello!'
});

// Send a disappearing message (view once)
await thread.sendMessage({
  text: 'This disappears',
  disappearingMediaType: 'permanent_media'
});

// Send a link
await thread.sendMessage({
  link: {
    url: 'https://example.com',
    title: 'Example'
  }
});

// Get conversation history
const messages = await thread.messages();
messages.forEach(msg => {
  console.log(`${msg.user.username}: ${msg.text}`);
});
```

### Posts & Media

```javascript
// Get your feed
const feed = await ig.feed.timeline();
const items = await feed.items();
items.forEach(post => {
  console.log(`@${post.user.username}: ${post.caption?.text || '(no caption)'}`);
});

// Get a specific post
const media = await ig.media.info(mediaId);
console.log(`${media.caption?.text}, Likes: ${media.like_count}`);

// Like a post
await ig.media.like(mediaId);

// Unlike a post
await ig.media.unlike(mediaId);

// Comment on a post
await ig.media.comment(mediaId, 'Nice post!');

// Get comments
const comments = await ig.media.comments(mediaId);

// Like a comment
await ig.media.likeComment(commentId);
```

### Stories

```javascript
// Get all stories from people you follow
const stories = await ig.feed.reels_tray();

// Watch a story
await ig.story.seen(storyId);
```

### Upload Media

```javascript
// Upload a photo
const photo = {
  path: './photo.jpg',
  caption: 'Check this out!'
};
await ig.media.upload.photo(photo);

// Upload a video
const video = {
  path: './video.mp4',
  caption: 'New video!',
  thumbnail: './thumbnail.jpg' // optional
};
await ig.media.upload.video(video);

// Upload carousel (multiple photos/videos)
const items = [
  { path: './photo1.jpg', type: 'photo' },
  { path: './video.mp4', type: 'video' }
];
await ig.media.upload.carousel(items);
```

### Search

```javascript
// Search for users
const users = await ig.user.search({ username: 'instagram' });

// Search for hashtags
const hashtags = await ig.hashtag.search('javascript');

// Get posts from a hashtag
const feed = await ig.hashtag.feed('javascript');
const posts = await feed.items();
```

---

## Session Management

Sessions let you avoid logging in repeatedly. Instagram sessions contain cookies and tokens—save them and reuse them.

### Save a Session

```javascript
const ig = new IgApiClient();
await ig.login({
  username: 'your_username',
  password: 'your_password',
  email: 'your_email@example.com'
});

const session = await ig.saveSession();
console.log(JSON.stringify(session));
```

### Load a Saved Session

```javascript
const ig = new IgApiClient();
const session = JSON.parse(fs.readFileSync('session.json'));

await ig.loadSession(session);
console.log('Loaded session');
```

### Sessions Expire

If you get a 401 error, the session expired. Just login again and get a fresh session. This is normal.

```javascript
try {
  // Use the session
  await ig.user.info(userId);
} catch (error) {
  if (error.status === 401) {
    console.log('Session expired, logging in again...');
    await ig.login({
      username: 'your_username',
      password: 'your_password',
      email: 'your_email@example.com'
    });
  }
}
```

---

## How MQTT Authentication Works

Behind the scenes, here's what happens:

1. **Login** - You provide username, password, email
2. **Instagram Response** - Returns a Bearer token with embedded sessionid
3. **MQTT Connection** - The sessionid is extracted from the token and used to authenticate to the MQTT broker
4. **Real-Time Messages** - Broker accepts authentication and starts sending you updates

The library handles all of this automatically. You just provide credentials and call `realtime.connect()`.

The MQTT broker is at `edge-mqtt.facebook.com:443` using TLS. All payloads are compressed with deflate.

---

## Troubleshooting

### Connection Hangs on `realtime.connect()`

If the connection just sits there and never fires the `connected` event:

1. **Check credentials** - Are they 100% correct? Try logging in on the Instagram app to verify.
2. **Check your IP** - Instagram might be rate-limiting your IP. Wait a few hours and try again.
3. **Try a fresh session** - Delete your saved session file and login fresh.
4. **Network issues** - Check your firewall and proxy settings. MQTT needs port 443 open to `edge-mqtt.facebook.com`.

### Getting 400/401 Errors

- **401 Unauthorized** - Your session expired. Login again.
- **400 Bad Request** - Either credentials are wrong or Instagram changed something. Double-check the login payload.

### Messages Not Being Received

1. **Check subscriptions** - Make sure `'ig_sub_direct'` is in your `graphQlSubs` array.
2. **Send a test message** - Have another account send you a DM while listening.
3. **Check the event** - Use `realtime.on('receiveRaw', ...)` to see all raw messages if parsing fails.
4. **Enable debug logs**:

```javascript
const realtime = new RealtimeClient(ig);
realtime.on('receive', (topic, messages) => {
  console.log(`Topic: ${topic.path}`);
  console.log(`Messages:`, JSON.stringify(messages, null, 2));
});
```

### Getting Rate Limited

Instagram aggressively rate-limits API access. If you get errors like "too many requests":

- **Space out your requests** - Add delays between API calls
- **Use exponential backoff** - Wait longer between retries
- **Switch accounts** - Use multiple accounts if doing heavy testing
- **Respect the platform** - Don't hammer it with requests

The library has built-in retry logic, but be mindful of how many requests you're making.

---

## Examples

Complete working examples are in the `examples/` directory. Run them like:

```bash
export INSTAGRAM_USERNAME="your_username"
export INSTAGRAM_PASSWORD="your_password"
export INSTAGRAM_EMAIL="your_email@example.com"

node examples/listen-to-messages.js
```

The `listen-to-messages.js` example shows a real-time listener set up for production use.

---

## Important Notes

### Account Safety

- **Use test accounts** - Don't use your main Instagram account while developing
- **Respect rate limits** - Instagram monitors API usage and will block aggressive clients
- **Don't spam** - Don't send automated bulk messages or spam. That's how accounts get banned
- **Be honest** - If your app uses this library, be transparent about it to your users

### Reverse Engineering Reality

Instagram's API is intentionally private. They:
- Change endpoints without warning
- Block accounts that look suspicious
- Update security measures frequently
- Actively work against tools like this

**This library works today because of reverse engineering efforts from the community.** When it breaks, it's usually because Instagram changed something. Check the issues and help fix it.

**Your pull requests are valuable.** If you find a bug or fix something that broke, please contribute back.

---

## License

MIT - Use it, modify it, learn from it. No warranty included.

---

## Contributing

Reverse engineering Instagram is a community effort. If you:
- Find a bug → Open an issue
- Have a fix → Submit a pull request
- Find something broken → Help us understand what changed
- Want to improve documentation → Contribute!

The library is only useful if it keeps working as Instagram changes. Help keep it alive.

---

**Built by developers who spent way too much time reverse engineering Instagram.** If this library helps you, please consider contributing back or starring the repo.
