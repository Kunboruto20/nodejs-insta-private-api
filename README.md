# nodejs-insta-private-api

Instagram Private API client for Node.js with real-time MQTT direct messaging. Send and receive DMs instantly using Instagram's native protocol. Perfect for building Instagram bots with sub-second latency. No emulators, no wrappers—just direct access to Instagram's backend through reverse-engineered protocol support.

## Features

- ✅ **Real-time MQTT messaging** - Receive and send DMs with <500ms latency
- ✅ **Bidirectional communication** - Send messages back through the same MQTT connection
- ✅ **Auto-reply bots** - Build keyword-triggered or scheduled response bots
- ✅ **Session persistence** - Avoid repeated logins with saved sessions
- ✅ **Full Instagram API** - Stories, media uploads, search, comments, user info
- ✅ **Group chat support** - Automatic detection with thread-based messaging
- ✅ **IRIS subscription protocol** - Reliable message delivery with compression
- ✅ **Automatic reconnection** - Exponential backoff with connection pooling
- ✅ **Pure JavaScript** - No compilation required, works in Node.js 18+

## Installation

```bash
npm install nodejs-insta-private-api
```

Requires **Node.js 18 or higher**.

## Quick Start

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
console.log('✅ Session saved to session.json');
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

console.log('✅ Connected! Listening for messages...');

// Messages arrive in real-time
realtime.on('message', (data) => {
  const msg = data.message;
  console.log(`📨 DM from ${msg.from_user_id}: ${msg.text}`);
});
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

  console.log('🤖 Auto-Reply Bot Active\n');

  realtime.on('message', async (data) => {
    const msg = data.message;
    if (!msg?.text) return; // Skip media messages

    console.log(`📨 [${msg.from_user_id}]: ${msg.text}`);

    // Auto-reply logic
    let reply = null;

    if (msg.text.toLowerCase().includes('hello')) {
      reply = '👋 Hey! Thanks for reaching out!';
    } else if (msg.text.toLowerCase().includes('help')) {
      reply = '❓ How can I assist you?';
    } else if (msg.text.toLowerCase().includes('thanks')) {
      reply = '😊 You\'re welcome!';
    }

    // Send reply if matched
    if (reply) {
      try {
        await realtime.directCommands.sendTextViaRealtime(
          msg.thread_id,
          reply
        );
        console.log(`✅ Replied: ${reply}\n`);
      } catch (err) {
        console.error(`❌ Failed to send reply: ${err.message}\n`);
      }
    }
  });

  // Keep bot running
  await new Promise(() => {});
})();
```

### Example 2: Group Message Logger Bot

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

  const logs = [];

  realtime.on('message', (data) => {
    const msg = data.message;
    if (!msg?.text) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: msg.from_user_id,
      threadId: msg.thread_id,
      text: msg.text,
      isGroup: msg.thread_id // Can check thread metadata
    };

    logs.push(logEntry);
    console.log(`📝 Logged: [${logEntry.userId}] ${logEntry.text.substring(0, 50)}...`);

    // Save logs every 10 messages
    if (logs.length % 10 === 0) {
      fs.writeFileSync('message_logs.json', JSON.stringify(logs, null, 2));
      console.log(`💾 Saved ${logs.length} messages to message_logs.json`);
    }
  });

  console.log('📊 Message Logger Bot Started\n');
  await new Promise(() => {});
})();
```

### Example 3: Smart Response Bot (Multi-trigger)

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

  // Response rules
  const responseRules = {
    'ping': 'pong! 🏓',
    'time': () => new Date().toLocaleTimeString(),
    'hello': 'Hey there! 👋',
    'help': 'Available commands: ping, time, hello, help',
    'status': '✅ Bot is online and running!',
  };

  console.log('🤖 Smart Response Bot Started\n');

  realtime.on('message', async (data) => {
    const msg = data.message;
    if (!msg?.text) return;

    const command = msg.text.toLowerCase().trim();
    console.log(`📨 Command: ${command}`);

    for (const [trigger, response] of Object.entries(responseRules)) {
      if (command.includes(trigger)) {
        try {
          const reply = typeof response === 'function' ? response() : response;
          
          await realtime.directCommands.sendTextViaRealtime(
            msg.thread_id,
            reply
          );
          console.log(`✅ Replied: ${reply}\n`);
          break;
        } catch (err) {
          console.error(`❌ Error: ${err.message}\n`);
        }
      }
    }
  });

  await new Promise(() => {});
})();
```

### Example 4: Rate-Limited Response Bot

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

  // Rate limiting: max 1 reply per user per minute
  const userRateLimit = new Map();
  const RATE_LIMIT_MS = 60000; // 1 minute

  const canReply = (userId) => {
    const lastReply = userRateLimit.get(userId);
    if (!lastReply || Date.now() - lastReply > RATE_LIMIT_MS) {
      userRateLimit.set(userId, Date.now());
      return true;
    }
    return false;
  };

  console.log('🤖 Rate-Limited Bot Started\n');

  realtime.on('message', async (data) => {
    const msg = data.message;
    if (!msg?.text) return;

    if (!canReply(msg.from_user_id)) {
      console.log(`⏱️  Rate limited for user ${msg.from_user_id}`);
      return;
    }

    try {
      await realtime.directCommands.sendTextViaRealtime(
        msg.thread_id,
        `🤖 Thanks for your message! I'll get back to you soon.`
      );
      console.log(`✅ Replied to ${msg.from_user_id}\n`);
    } catch (err) {
      console.error(`❌ Error: ${err.message}\n`);
    }
  });

  await new Promise(() => {});
})();
```

### Example 5: Bulk DM Sender (Infinite Loop - Mass Messaging)

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  const ig = new IgApiClient();
  
  // Login
  const username = await question('📧 Username: ');
  const password = await question('🔑 Password: ');
  
  await ig.login({ username, password });
  console.log('✅ Logged in!\n');

  // Fetch inbox
  const inbox = await ig.direct.getInbox();
  const threads = inbox.inbox.threads;
  console.log(`📋 Found ${threads.length} conversations\n`);

  // Show groups
  threads.forEach((thread, index) => {
    console.log(`  ${index + 1}. ${thread.thread_title || 'Group ' + (index + 1)}`);
  });

  // Select groups
  const selectedInput = await question('\n📍 Enter group numbers (1,2,3): ');
  const selectedThreads = selectedInput
    .split(',')
    .map(s => parseInt(s.trim()) - 1)
    .map(i => threads[i])
    .filter(t => t);

  // Load message from file
  const filePath = await question('📄 Enter text file path: ');
  const messageText = fs.readFileSync(filePath, 'utf8').trim();

  // Select mode
  console.log('\n📮 Mode: 1=Line by line, 2=Entire text');
  const mode = parseInt(await question('Choose: '));

  // Set delay
  const delaySeconds = parseInt(await question('⏱️  Delay (seconds): '));

  rl.close();

  // Connect to MQTT
  const realtime = new RealtimeClient(ig);
  await realtime.connect({
    graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
    skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
    irisData: inbox
  });

  console.log('\n🚀 INFINITE LOOP STARTED - Press Ctrl+C to stop\n');

  let roundCount = 0;
  let totalSent = 0;

  if (mode === 1) {
    // LINE BY LINE MODE
    const lines = messageText.split('\n').filter(line => line.trim().length > 0);

    while (true) {
      roundCount++;
      console.log(`\n🔄 ROUND #${roundCount}`);

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];

        for (let i = 0; i < selectedThreads.length; i++) {
          const thread = selectedThreads[i];
          
          try {
            await realtime.directCommands.sendTextViaRealtime(
              thread.thread_id,
              line
            );
            totalSent++;
            console.log(`✅ Sent to group ${i + 1}`);
          } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
          }

          if ((lineIdx < lines.length - 1 || i < selectedThreads.length - 1) && delaySeconds > 0) {
            await new Promise(r => setTimeout(r, delaySeconds * 1000));
          }
        }
      }

      console.log(`📊 Total sent: ${totalSent}`);
      console.log(`⏳ Waiting ${delaySeconds}s before next round...\n`);
      await new Promise(r => setTimeout(r, delaySeconds * 1000));
    }

  } else {
    // ENTIRE TEXT MODE
    while (true) {
      roundCount++;
      console.log(`\n🔄 ROUND #${roundCount}`);

      for (let i = 0; i < selectedThreads.length; i++) {
        const thread = selectedThreads[i];
        
        try {
          await realtime.directCommands.sendTextViaRealtime(
            thread.thread_id,
            messageText
          );
          totalSent++;
          console.log(`✅ Sent to group ${i + 1}`);
        } catch (err) {
          console.log(`❌ Failed: ${err.message}`);
        }

        if (i < selectedThreads.length - 1 && delaySeconds > 0) {
          await new Promise(r => setTimeout(r, delaySeconds * 1000));
        }
      }

      console.log(`📊 Total sent: ${totalSent}`);
      console.log(`⏳ Waiting ${delaySeconds}s before next round...\n`);
      await new Promise(r => setTimeout(r, delaySeconds * 1000));
    }
  }
})();
```

**Features:**
- ✅ Select multiple groups to message
- ✅ Load messages from text file
- ✅ Mode 1: Send line-by-line in infinite loop
- ✅ Mode 2: Send entire text repeatedly
- ✅ Custom delay between messages
- ✅ Real-time delivery via MQTT
- ✅ Runs forever until manually stopped

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
```

#### Sending Messages via MQTT

```javascript
// Send text message (fast - real-time)
await realtime.directCommands.sendTextViaRealtime(
  threadId,
  'Your message here'
);
```

**Complete Example:**

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

const ig = new IgApiClient();
const realtime = new RealtimeClient(ig);

// Send MQTT message
await realtime.directCommands.sendTextViaRealtime(
  threadId,
  'Hello! 🚀'
);
```

#### Listening for Events

```javascript
// Incoming messages
realtime.on('message', (data) => {
  const msg = data.message;
  console.log(msg.text);      // Message text
  console.log(msg.from_user_id); // Sender user ID
  console.log(msg.thread_id);    // Conversation thread ID
});

// Connection status
realtime.on('connected', () => console.log('Connected'));
realtime.on('disconnected', () => console.log('Disconnected'));

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
    text: msg.text,              // Message content (string)
    from_user_id: msg.from_user_id,  // Sender's Instagram user ID
    thread_id: msg.thread_id,    // Conversation thread ID
    timestamp: msg.timestamp,    // Unix timestamp
    item_id: msg.item_id         // Unique message ID
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

**MQTT is significantly faster** for both receiving and sending messages.

---

## Best Practices

### 1. Session Management
```javascript
// Always save session after first login
fs.writeFileSync('session.json', JSON.stringify(ig.state.serialize()));

// Reuse sessions to avoid repeated logins
const session = JSON.parse(fs.readFileSync('session.json'));
await ig.state.deserialize(session);
```

### 2. Error Handling
```javascript
realtime.on('message', async (data) => {
  try {
    const msg = data.message;
    // Process message...
    
    await realtime.directCommands.sendTextViaRealtime(msg.thread_id, reply);
  } catch (err) {
    console.error('Error:', err.message);
    // Don't crash - continue listening
  }
});
```

### 3. Rate Limiting
```javascript
// Implement rate limiting to avoid Instagram detection
const userLastSeen = new Map();

if (userLastSeen.has(userId) && Date.now() - userLastSeen.get(userId) < 5000) {
  return; // Skip if user sent message <5s ago
}
userLastSeen.set(userId, Date.now());
```

### 4. Connection Monitoring
```javascript
let isConnected = false;

realtime.on('connected', () => {
  isConnected = true;
  console.log('✅ Connected');
});

realtime.on('disconnected', () => {
  isConnected = false;
  console.log('❌ Disconnected - will auto-reconnect');
});

realtime.on('error', (err) => {
  console.error('Connection error:', err.message);
});
```

### 5. Process Management (PM2)
```bash
# Save as bot.js, then run:
pm2 start bot.js --name "instagram-bot" --restart-delay 5000
pm2 logs instagram-bot
```

---

## How It Works

1. **Authentication** - Login with credentials or load saved session
2. **IRIS Subscription** - Fetch inbox data and subscribe to real-time topics
3. **MQTT Connection** - Connect to `edge-mqtt.facebook.com` (Instagram's MQTT broker)
4. **Message Sync** - Subscribe to MESSAGE_SYNC topic (topic 146) for real-time DM updates
5. **Event Emission** - Incoming messages trigger 'message' events with full data
6. **Direct Sending** - Send replies back through MQTT with millisecond latency

**Result**: Full-duplex communication with Instagram DMs in real-time, no polling required.

---

## Troubleshooting

### "Session invalid" or "Login required"
```javascript
// Session may have expired, login again
await ig.login({ username, password, email });
fs.writeFileSync('session.json', JSON.stringify(ig.state.serialize()));
```

### Not receiving messages
```javascript
// Make sure to fetch inbox BEFORE connecting
const inbox = await ig.direct.getInbox();
await realtime.connect({ irisData: inbox, ... });
```

### Connection drops after minutes
```javascript
// Auto-reconnection is built-in
// Monitor with:
realtime.on('disconnected', () => {
  console.log('Reconnecting...');
});
```

### "rate_limit_error"
```javascript
// Instagram throttling - implement delays
// Wait 5-10 seconds between high-frequency operations
setTimeout(() => { /* next operation */ }, 5000);
```

---

## Advanced Usage

### Custom Message Filtering

```javascript
realtime.on('message', (data) => {
  const msg = data.message;
  
  // Only process text messages from specific users
  if (msg.text && whitelistedUsers.includes(msg.from_user_id)) {
    processMessage(msg);
  }
});
```

### Batch Processing

```javascript
const messageQueue = [];

realtime.on('message', (data) => {
  messageQueue.push(data.message);
});

// Process batch every 30 seconds
setInterval(() => {
  if (messageQueue.length > 0) {
    processBatch(messageQueue);
    messageQueue.length = 0;
  }
}, 30000);
```

---

## Contributing

Contributions welcome! Please fork the repository and submit pull requests.

## License

MIT License - See LICENSE file for details

## Disclaimer

This library is for educational purposes. Instagram's Terms of Service prohibit automated bots. Use responsibly and at your own risk. The author is not responsible for account suspension or other consequences.

---

## Support

For issues, questions, or feature requests:
- 📝 GitHub Issues: https://github.com/Kunboruto20/nodejs-insta-private-api/issues
- 💬 Discussions: https://github.com/Kunboruto20/nodejs-insta-private-api/discussions

---

**Version**: 5.57.9 | **Last Updated**: 2025-11-29 | **Status**: Production Ready

---

## Interactive Bot Script

Ready-to-use command-line bot for sending and receiving Instagram DMs interactively. No configuration needed - just run and login!

```javascript
#!/usr/bin/env node
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     📱 Instagram DM Bot - Interactive Mode v5.57.9        ║');
    console.log('║            Type messages & receive DMs in real-time       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    let useExistingSession = false;
    const sessionFile = 'session.json';
    
    if (fs.existsSync(sessionFile)) {
      const response = await question('📂 Found saved session. Use it? (y/n): ');
      useExistingSession = response.toLowerCase() === 'y';
    }

    let ig = new IgApiClient();

    if (useExistingSession) {
      console.log('\n📂 Loading saved session...');
      const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      await ig.state.deserialize(session);
      console.log('✅ Session loaded!\n');
    } else {
      console.log('\n🔐 Enter your Instagram credentials:\n');
      const username = await question('📧 Username: ');
      const password = await question('🔑 Password: ');
      const email = await question('📨 Email (press Enter to skip): ');

      console.log('\n⏳ Authenticating...');
      
      try {
        await ig.login({
          username: username,
          password: password,
          email: email || undefined
        });
      } catch (err) {
        console.error('❌ Login failed:', err.message);
        process.exit(1);
      }

      fs.writeFileSync(sessionFile, JSON.stringify(ig.state.serialize(), null, 2));
      console.log('✅ Logged in! Session saved to session.json\n');
    }

    console.log('📋 Fetching inbox...');
    const inbox = await ig.direct.getInbox();
    console.log(`✅ Got ${inbox.inbox.threads.length} conversations\n`);

    const realtime = new RealtimeClient(ig);
    
    console.log('🔌 Connecting to MQTT...');
    await realtime.connect({
      graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
      skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
      irisData: inbox
    });

    console.log('✅ Connected!\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║              🤖 Bot is ACTIVE and listening!              ║');
    console.log('║                                                           ║');
    console.log('║  • Messages appear as they arrive                          ║');
    console.log('║  • Type your reply and press Enter                         ║');
    console.log('║  • Type "exit" to stop                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    let currentThreadId = null;
    let messageCount = 0;

    realtime.on('message', async (data) => {
      const msg = data.message;
      if (!msg?.text || msg.text === 'no text') return;

      currentThreadId = msg.thread_id;
      messageCount++;

      console.log('\n' + '─'.repeat(60));
      console.log(`📨 MESSAGE #${messageCount} from User ${msg.from_user_id}`);
      console.log('─'.repeat(60));
      console.log(msg.text);
      console.log('─'.repeat(60) + '\n');

      rl.prompt();
    });

    realtime.on('error', (err) => {
      console.error(`\n❌ Error: ${err.message}\n`);
    });

    realtime.on('disconnected', () => {
      console.log('\n⚠️  Connection lost. Reconnecting...\n');
    });

    rl.setPrompt('💬 Reply: ');
    rl.prompt();

    rl.on('line', async (input) => {
      const message = input.trim();

      if (message.toLowerCase() === 'exit') {
        console.log('\n👋 Bot stopped. Goodbye!\n');
        process.exit(0);
      }

      if (!message) {
        rl.prompt();
        return;
      }

      if (!currentThreadId) {
        console.log('⏳ Waiting for a message...');
        rl.prompt();
        return;
      }

      try {
        await realtime.directCommands.sendTextViaRealtime(
          currentThreadId,
          message
        );
        console.log('✅ Sent!\n');
      } catch (err) {
        console.error(`❌ Failed: ${err.message}\n`);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\n👋 Bot stopped.');
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
```

### How to Use:

1. **Install**
```bash
npm install nodejs-insta-private-api
```

2. **Create bot.js** - Copy the script above

3. **Run**
```bash
node bot.js
```

4. **Login** - Enter your Instagram credentials

5. **Chat** - Type replies when messages arrive

### Features:
- ✅ Interactive login (or uses saved session)
- ✅ Real-time message receiving via MQTT
- ✅ Instant message delivery via MQTT
- ✅ Session persistence (no re-login needed)
- ✅ Clean CLI interface with emoji formatting
- ✅ Auto-reconnection on disconnection

### Example Output:
```
📧 Username: your_username
🔑 Password: ••••••••••

🤖 Bot is ACTIVE and listening!

────────────────────────────────────────────────────────────
📨 MESSAGE #1 from User 123456789
────────────────────────────────────────────────────────────
Hey! How are you?
────────────────────────────────────────────────────────────

💬 Reply: I'm doing great! How about you?
✅ Sent!
```

### Troubleshooting:

**Session expired:**
```bash
rm session.json
node bot.js  # Login again
```

**Module not found:**
Make sure you used: `require('nodejs-insta-private-api')` not `require('./dist/index.js')`
