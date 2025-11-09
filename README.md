# nodejs-insta-private-api
VERSION 3.3.1 Update library for latest Instagram Version 
A pure JavaScript Instagram Private API client in written in CommonJS without TypeScript.

[![npm version](https://badge.fury.io/js/nodejs-insta-private-api.svg)](https://www.npmjs.com/package/nodejs-insta-private-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔐 **Authentication** - Username, email and password login with session management
- 💬 **Direct Messages** - Send text, images, and videos to users and groups
- 📱 **Stories** - React to stories, upload content, and view story feeds
- 📤 **Feed Operations** - Upload photos/videos, like, comment, and browse timeline
- 🍪 **Session Management** - Save and restore login sessions
- 🔄 **Auto-retry** - Built-in retry logic for failed requests
- 📋 **Comprehensive API** - 50+ methods covering most Instagram features
- 🚀 **High Performance** - Optimized for speed and reliability
- 📡 **Realtime MQTT** - Real-time events via MQTT using edge-mqtt.facebook.com (GraphQL, Pub/Sub, Message Sync, Iris)

## 📡 Realtime MQTT Features

The realtime service provides comprehensive Instagram real-time messaging:

- ✅ **Correct Endpoint** - Uses edge-mqtt.facebook.com (Instagram's official MQTT broker)
- ✅ **All Topics Supported** - GraphQL, Pub/Sub, Message Sync, Iris, Region Hints
- ✅ **Automatic Reconnection** - Robust error handling with exponential backoff
- ✅ **Message Parsing** - Dedicated parsers for each message type
- ✅ **Event System** - Comprehensive event handling for all realtime activities

## Installation

```bash
npm install nodejs-insta-private-api
```

## Quick Start

### Basic Usage

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');

async function main() {
  const ig = new IgApiClient();
  
  try {
    // Login
    await ig.login({ 
      username: 'your_username', 
      password: 'your_password',
      email: 'your_email@example.com' 
    });
    
    console.log('✅ Logged in successfully!');
    
    // Send a DM
    await ig.dm.send({ 
      to: 'friend_username', 
      message: 'Hello from the API!' 
    });
    
    console.log('✅ Message sent!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
```

### Realtime Usage

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');

async function main() {
  const ig = new IgApiClient();
  
  try {
    // Login
    await ig.login({ 
      username: 'your_username', 
      password: 'your_password',
      email: 'your_email@example.com' 
    });
    
    // Connect to realtime MQTT
    await ig.connectRealtime();
    
    // Listen for real-time events
    ig.realtime.on('messageSync', (data) => {
      console.log('💬 Message sync:', data);
    });
    
    ig.realtime.on('graphqlMessage', (data) => {
      console.log('🔍 GraphQL message:', data);
    });
    
    ig.realtime.on('pubsubMessage', (data) => {
      console.log('📢 Pub/Sub message:', data);
    });
    
    console.log('✅ Connected to realtime!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
```

## Table of Contents

- [Authentication](#authentication)
- [Direct Messages](#direct-messages)
- [Stories](#stories)
- [Feed Operations](#feed-operations)
- [User Operations](#user-operations)
- [Media Operations](#media-operations)
- [Session Management](#session-management)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)

## Authentication

### Basic Login

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');
const ig = new IgApiClient();

// Login with username and password
await ig.login({
  username: 'your_username',
  password: 'your_password',
  email: 'your_email@example.com' // Optional but recommended
});

// Check if logged in
if (ig.isLoggedIn()) {
  console.log('Successfully logged in!');
}
```

### Two-Factor Authentication

```javascript
try {
  await ig.login({ username, password, email });
} catch (error) {
  if (error.name === 'IgLoginTwoFactorRequiredError') {
    // Handle 2FA
    const code = '123456'; // Get from user input
    await ig.account.twoFactorLogin({
      username,
      verificationCode: code,
      twoFactorIdentifier: error.response.data.two_factor_info.two_factor_identifier
    });
  }
}
```

### Session Management

```javascript
// Save session after login
const session = await ig.saveSession();
fs.writeFileSync('session.json', JSON.stringify(session));

// Load session later
const session = JSON.parse(fs.readFileSync('session.json'));
await ig.loadSession(session);

// Check if session is still valid
if (await ig.isSessionValid()) {
  console.log('Session is valid!');
} else {
  console.log('Need to login again');
}
```

## Direct Messages

### Send Text Messages

```javascript
// Send to a single user
await ig.dm.send({
  to: 'username',
  message: 'Hello! 👋'
});

// Send to multiple users
await ig.dm.send({
  to: ['user1', 'user2', 'user3'],
  message: 'Group message!'
});
```

### Send to Groups

```javascript
// Send to existing group by thread ID
await ig.dm.sendToGroup({
  threadId: 'group_thread_id',
  message: 'Hello group!'
});

// Create new group and send message
const group = await ig.direct.createGroupThread(
  ['user1', 'user2', 'user3'],
  'My Group Name'
);

await ig.dm.sendToGroup({
  threadId: group.thread_id,
  message: 'Welcome to the group!'
});
```

### Send Media

```javascript
// Send image
await ig.dm.sendImage({
  to: 'username',
  imagePath: './photo.jpg'
});

// Send video
await ig.dm.sendVideo({
  to: 'username',
  videoPath: './video.mp4'
});
```

### Manage Inbox

```javascript
// Get inbox
const inbox = await ig.dm.getInbox();
console.log(`You have ${inbox.inbox.threads.length} conversations`);

// Get specific thread
const thread = await ig.dm.getThread('thread_id');

// Mark messages as seen
for (const item of thread.thread.items) {
  await ig.directThread.markItemSeen(thread.thread.thread_id, item.item_id);
}
```

## Stories

### React to Stories

```javascript
// React with emoji
await ig.story.react({
  storyId: 'story_media_id',
  reaction: '❤️'
});

// React with different emojis
await ig.story.react({
  storyId: 'story_media_id', 
  reaction: '🔥'
});
```

### View Stories

```javascript
// Get story feed (stories tray)
const storyFeed = await ig.story.getFeed();

// Get specific user's stories
const userStories = await ig.story.getUser('user_id');

// Mark stories as seen
await ig.story.seen(userStories.reel.items);
```

### Upload Stories

```javascript
// Upload photo story
await ig.story.upload({
  imagePath: './story.jpg',
  caption: 'My story! #instagram'
});

// Upload video story
await ig.story.uploadVideo({
  videoPath: './story.mp4',
  caption: 'Video story!',
  duration_ms: 15000
});
```

### Story Highlights

```javascript
// Get user's highlights
const highlights = await ig.story.getHighlights('user_id');

// Get specific highlight
const highlight = await ig.story.getHighlight('highlight_id');
```

## Feed Operations

### Upload Posts

```javascript
// Upload photo
await ig.feed.upload({
  imagePath: './photo.jpg',
  caption: 'My awesome photo! #photography #instagram'
});

// Upload video
await ig.feed.uploadVideo({
  videoPath: './video.mp4',
  caption: 'Check out this video! 🎥',
  duration_ms: 30000,
  width: 720,
  height: 1280
});
```

### Upload Carousel (Multiple Photos/Videos)

```javascript
await ig.feed.uploadCarousel({
  items: [
    { type: 'photo', path: './photo1.jpg' },
    { type: 'photo', path: './photo2.jpg' },
    { type: 'video', path: './video1.mp4', duration_ms: 15000 }
  ],
  caption: 'My carousel post! Swipe to see more 👆'
});
```

### Browse Feeds

```javascript
// Get timeline feed
const timeline = await ig.feed.getFeed();

// Get user's posts
const userFeed = await ig.feed.getUserFeed('user_id');

// Get hashtag feed
const hashtagFeed = await ig.feed.getTag('photography');

// Get location feed
const locationFeed = await ig.feed.getLocation('location_id');

// Get explore feed
const exploreFeed = await ig.feed.getExploreFeed();

// Get liked posts
const likedPosts = await ig.feed.getLiked();

// Get saved posts
const savedPosts = await ig.feed.getSaved();
```

## User Operations

### User Information

```javascript
// Get user by username
const user = await ig.user.infoByUsername('instagram');

// Get user by ID
const user = await ig.user.info('user_id');

// Search users
const users = await ig.user.search('john');
```

### Follow/Unfollow

```javascript
// Follow user
await ig.user.follow('user_id');

// Unfollow user
await ig.user.unfollow('user_id');

// Get followers
const followers = await ig.user.getFollowers('user_id');

// Get following
const following = await ig.user.getFollowing('user_id');
```

## Media Operations

### Interact with Posts

```javascript
// Like a post
await ig.media.like('media_id');

// Unlike a post
await ig.media.unlike('media_id');

// Comment on a post
await ig.media.comment('media_id', 'Great post! 👍');

// Get post information
const mediaInfo = await ig.media.info('media_id');

// Get post likers
const likers = await ig.media.likers('media_id');

// Get post comments
const comments = await ig.media.comments('media_id');
```

### Manage Your Posts

```javascript
// Edit post caption
await ig.media.edit('media_id', 'New caption text');

// Delete post
await ig.media.delete('media_id');

// Delete comment
await ig.media.deleteComment('media_id', 'comment_id');
```

## Realtime MQTT Events

### Realtime Service

The realtime service provides comprehensive Instagram real-time messaging using the official MQTT broker.

```javascript
// Login first (required for realtime)
await ig.login({ username, password });

// Connect to MQTT broker
await ig.connectRealtime();

// Check connection status
if (ig.isRealtimeConnected()) {
  console.log('Connected to realtime!');
}
```

### Listen for Events

```javascript
// Generic realtime event
ig.realtime.on('realtimeEvent', (event) => {
  console.log(`Topic: ${event.topic} (ID: ${event.topicId})`);
  console.log(`Data: ${JSON.stringify(event.data)}`);
});

// Specific event types
ig.realtime.on('messageSync', (data) => {
  console.log('Message sync:', data);
});

ig.realtime.on('graphqlMessage', (data) => {
  console.log('GraphQL message:', data);
});

ig.realtime.on('pubsubMessage', (data) => {
  console.log('Pub/Sub message:', data);
});

ig.realtime.on('sendMessageResponse', (data) => {
  console.log('Send message response:', data);
});

ig.realtime.on('irisSubResponse', (data) => {
  console.log('Iris subscription response:', data);
});

ig.realtime.on('regionHint', (data) => {
  console.log('Region hint:', data);
});

ig.realtime.on('realtimeSub', (data) => {
  console.log('Realtime subscription:', data);
});

ig.realtime.on('foregroundState', (data) => {
  console.log('Foreground state:', data);
});

ig.realtime.on('sendMessage', (data) => {
  console.log('Send message:', data);
});
```

### Realtime Management

```javascript
// Ping the broker
ig.pingRealtime();

// Get connection stats
const stats = ig.getRealtimeStats();
console.log(stats);

// Configure reconnection
ig.setRealtimeReconnectOptions({
  maxAttempts: 5,
  delay: 3000
});

// Disconnect
ig.disconnectRealtime();
```

### Available MQTT Topics

| Topic | ID | Description | Event |
|-------|----|-------------|-------|
| `/graphql` | 9 | GraphQL queries/mutations | `graphqlMessage` |
| `/pubsub` | 88 | Pub/Sub messages | `pubsubMessage` |
| `/ig_send_message_response` | 133 | Send message responses | `sendMessageResponse` |
| `/ig_sub_iris_response` | 135 | Iris subscription responses | `irisSubResponse` |
| `/ig_message_sync` | 146 | Message synchronization | `messageSync` |
| `/ig_realtime_sub` | 149 | Realtime subscriptions | `realtimeSub` |
| `/t_region_hint` | 150 | Region hints | `regionHint` |
| `/t_fs` | 102 | Foreground state | `foregroundState` |
| `/ig_send_message` | 132 | Send messages | `sendMessage` |

### Realtime Features

- ✅ **Correct Endpoint** - Uses edge-mqtt.facebook.com (Instagram's official MQTT broker)
- ✅ **All Topics Supported** - Complete coverage of Instagram's realtime system
- ✅ **Message Parsing** - Dedicated parsers for each message type
- ✅ **Automatic Reconnection** - Robust error handling with exponential backoff
- ✅ **Event System** - Comprehensive event handling for all realtime activities

## Error Handling

### Basic Error Handling

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');
const Utils = require('nodejs-insta-private-api/dist/utils');

try {
  await ig.login({ username, password, email });
} catch (error) {
  console.log('Error type:', error.name);
  console.log('Human readable:', Utils.humanizeError(error));
  
  // Handle specific errors
  switch (error.name) {
    case 'IgLoginBadPasswordError':
      console.log('Wrong password!');
      break;
    case 'IgLoginTwoFactorRequiredError':
      console.log('2FA required');
      break;
    case 'IgCheckpointError':
      console.log('Account verification required');
      break;
    case 'IgActionSpamError':
      console.log('Action blocked - wait before retrying');
      break;
    default:
      console.log('Unknown error:', error.message);
  }
}
```

### Retry Logic

```javascript
const Utils = require('nodejs-insta-private-api/dist/utils');

// Retry failed operations
await Utils.retryOperation(async () => {
  return await ig.dm.send({ to: 'username', message: 'Hello!' });
}, 3, 2000); // 3 retries, 2 second delay
```

## Advanced Usage

### Rate Limiting

```javascript
const Utils = require('nodejs-insta-private-api/dist/utils');

// Add delays between requests
await ig.dm.send({ to: 'user1', message: 'Hello!' });
await Utils.randomDelay(1000, 3000); // Wait 1-3 seconds
await ig.dm.send({ to: 'user2', message: 'Hello!' });
```

### Batch Operations

```javascript
// Send messages to multiple users with delays
const users = ['user1', 'user2', 'user3'];
const message = 'Hello from the API!';

for (const user of users) {
  try {
    await ig.dm.send({ to: user, message });
    console.log(`✅ Message sent to ${user}`);
    
    // Wait between requests to avoid rate limiting
    await Utils.randomDelay(2000, 5000);
  } catch (error) {
    console.log(`❌ Failed to send to ${user}:`, error.message);
  }
}
```

### File Validation

```javascript
const Utils = require('nodejs-insta-private-api/dist/utils');

// Validate files before uploading
if (Utils.isImageFile('./photo.jpg') && Utils.validateFileSize('./photo.jpg', 8 * 1024 * 1024)) {
  await ig.feed.upload({
    imagePath: './photo.jpg',
    caption: 'Valid image!'
  });
} else {
  console.log('Invalid file!');
}
```

## API Reference

### IgApiClient

Main client class for interacting with Instagram.

```javascript
const ig = new IgApiClient();
```

#### Methods

- `login(credentials)` - Login with username/password
- `logout()` - Logout and clear session
- `isLoggedIn()` - Check if currently logged in
- `saveSession()` - Save current session
- `loadSession(session)` - Load saved session
- `isSessionValid()` - Check if session is valid
- `destroy()` - Cleanup resources

#### Realtime Methods

- `connectRealtime()` - Connect to MQTT broker
- `disconnectRealtime()` - Disconnect from MQTT broker
- `isRealtimeConnected()` - Check connection status
- `pingRealtime()` - Send ping to broker
- `getRealtimeStats()` - Get connection statistics
- `setRealtimeReconnectOptions(options)` - Configure reconnection behavior

### Repositories

All repositories are accessible through the main client:

- `ig.account` - Account operations
- `ig.user` - User operations  
- `ig.direct` - Direct message operations
- `ig.directThread` - Thread management
- `ig.media` - Media operations
- `ig.upload` - File uploads
- `ig.story` - Story operations
- `ig.feed` - Feed operations

### Convenient Access

- `ig.dm` - Shortcut for common DM operations
  - `send(options)` - Send message
  - `sendToGroup(options)` - Send to group
  - `sendImage(options)` - Send image
  - `sendVideo(options)` - Send video
  - `getInbox()` - Get inbox
  - `getThread(id)` - Get thread

## Requirements

- Node.js >= 14.0.0
- Valid Instagram account

## Dependencies

- `axios` - HTTP client
- `tough-cookie` - Cookie management
- `form-data` - Form data handling
- `chance` - Random data generation
- `lodash` - Utility functions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This library is for educational purposes only. Use at your own risk and in compliance with Instagram's Terms of Service. The authors are not responsible for any misuse of this library.

## Support

If you find this library useful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting features
- 📖 Improving documentation

## Changelog

### v4.7.0 - New Realtime MQTT System
- 🚀 **NEW!** Complete realtime system rewrite using edge-mqtt.facebook.com
- 📡 **Added** Support for all Instagram realtime topics (GraphQL, Pub/Sub, Message Sync, Iris)
- 🔧 **Added** Dedicated parsers for each message type
- 🔄 **Added** Automatic reconnection with exponential backoff
- 📊 **Added** Comprehensive event system for all realtime activities
- 🛡️ **Fixed** All previous realtime implementation issues
- 📚 **Updated** Complete documentation for new realtime system

### v1.0.0
- Initial release
- Full Instagram Private API implementation
- 50+ methods covering all major features
- Comprehensive error handling
- Session management
- TypeScript-free, pure JavaScript implementation
