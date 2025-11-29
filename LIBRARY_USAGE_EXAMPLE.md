# nodejs-insta-private-api - How to Use

## What This Library Does

This library lets you **send and receive Instagram Direct Messages in real-time** using MQTT protocol. It's perfect for building Instagram bots, auto-reply systems, and bulk messaging tools.

**Key Features:**
- ✅ Real-time message receiving (<500ms latency)
- ✅ Send messages instantly via MQTT
- ✅ Session persistence (no repeated logins)
- ✅ Group chat support
- ✅ Automatic reconnection

---

## Complete Usage Example

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
  try {
    console.log('📱 Instagram DM Bot Started\n');

    // ═══════════════════════════════════════════════════════════
    // STEP 1: LOGIN
    // ═══════════════════════════════════════════════════════════
    
    const username = await question('📧 Instagram Username: ');
    const password = await question('🔑 Instagram Password: ');
    
    console.log('\n⏳ Logging in...');
    
    const ig = new IgApiClient();
    await ig.login({
      username: username,
      password: password
    });
    
    console.log('✅ Logged in!\n');
    
    // Save session so you don't need to login every time
    fs.writeFileSync('session.json', JSON.stringify(ig.state.serialize(), null, 2));
    console.log('💾 Session saved\n');

    // ═══════════════════════════════════════════════════════════
    // STEP 2: FETCH INBOX (Required before connecting to MQTT)
    // ═══════════════════════════════════════════════════════════
    
    console.log('📋 Fetching your conversations...');
    const inbox = await ig.direct.getInbox();
    const threads = inbox.inbox.threads;
    
    console.log(`✅ Got ${threads.length} conversations\n`);
    
    // Show all groups
    threads.forEach((thread, index) => {
      const name = thread.thread_title || `Group ${index + 1}`;
      console.log(`  ${index + 1}. ${name}`);
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 3: CONNECT TO MQTT (Real-time messaging)
    // ═══════════════════════════════════════════════════════════
    
    console.log('\n🔌 Connecting to MQTT...');
    
    const realtime = new RealtimeClient(ig);
    
    await realtime.connect({
      graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
      skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
      irisData: inbox  // Required!
    });
    
    console.log('✅ Connected!\n');

    // ═══════════════════════════════════════════════════════════
    // STEP 4: LISTEN FOR INCOMING MESSAGES
    // ═══════════════════════════════════════════════════════════
    
    console.log('👂 Listening for incoming messages...\n');
    
    realtime.on('message', async (data) => {
      const msg = data.message;
      
      // Skip if no text
      if (!msg?.text) return;
      
      console.log(`\n📨 Message from ${msg.from_user_id}:`);
      console.log(`   ${msg.text}\n`);
      
      // ═══════════════════════════════════════════════════════════
      // STEP 5: SEND REPLY BACK (via MQTT - instant!)
      // ═══════════════════════════════════════════════════════════
      
      try {
        await realtime.directCommands.sendTextViaRealtime(
          msg.thread_id,  // Which conversation to send to
          '✅ Got your message! Thanks!'  // What to send
        );
        console.log('✅ Reply sent!\n');
      } catch (err) {
        console.error(`❌ Failed to send: ${err.message}\n`);
      }
    });
    
    // Keep bot running
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
```

---

## How to Use This Code

### Installation

```bash
npm install nodejs-insta-private-api
```

### Run the Script

```bash
node bot.js
```

### What Happens

1. **Login** - Enter your Instagram username & password
2. **Fetch Inbox** - Gets all your conversations
3. **Connect MQTT** - Opens real-time connection
4. **Listen** - Waits for messages
5. **Reply** - Auto-replies to every message

---

## Key Functions Explained

| Function | What it does |
|----------|-------------|
| `ig.login()` | Authenticate with Instagram |
| `ig.direct.getInbox()` | Get all your conversations |
| `realtime.connect()` | Connect to MQTT for real-time messages |
| `realtime.on('message', ...)` | Listen for incoming DMs |
| `realtime.directCommands.sendTextViaRealtime()` | **Send message instantly via MQTT** |

---

## Message Object Structure

When a message arrives, you get:

```javascript
{
  text: 'Message content',           // What they said
  from_user_id: '12345',            // Who sent it
  thread_id: 'thread_id_here',      // Which conversation
  timestamp: 1234567890,            // When it was sent
  item_id: 'unique_msg_id'          // Message ID
}
```

---

## Advanced: Select Specific Groups

```javascript
// Let user select which groups to reply to
const selectedInput = await question('Which groups? (1,2,3): ');
const selectedThreads = selectedInput
  .split(',')
  .map(s => parseInt(s.trim()) - 1)
  .map(i => threads[i])
  .filter(t => t);

// Only reply to selected groups
realtime.on('message', async (data) => {
  const msg = data.message;
  
  if (!selectedThreads.find(t => t.thread_id === msg.thread_id)) {
    return; // Ignore if not in selected groups
  }
  
  // Reply only to selected groups
  await realtime.directCommands.sendTextViaRealtime(
    msg.thread_id,
    'Reply only to selected groups!'
  );
});
```

---

## Advanced: Load Message from File

```javascript
// Load message from text file
const filePath = await question('Message file path: ');
const messageText = fs.readFileSync(filePath, 'utf8').trim();

// Use it in your replies
await realtime.directCommands.sendTextViaRealtime(
  msg.thread_id,
  messageText
);
```

---

## Advanced: Bulk Sending to Multiple Groups

```javascript
// Send same message to multiple groups
for (let i = 0; i < selectedThreads.length; i++) {
  const thread = selectedThreads[i];
  
  try {
    await realtime.directCommands.sendTextViaRealtime(
      thread.thread_id,
      'Message to all groups!'
    );
    console.log(`✅ Sent to group ${i + 1}`);
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
  }
  
  // Wait 5 seconds before next message (avoid rate limiting)
  await new Promise(r => setTimeout(r, 5000));
}
```

---

## Common Patterns

### Pattern 1: Auto-Reply Bot
```javascript
realtime.on('message', async (data) => {
  const msg = data.message;
  if (msg.text.toLowerCase().includes('hello')) {
    await realtime.directCommands.sendTextViaRealtime(
      msg.thread_id,
      'Hi there! 👋'
    );
  }
});
```

### Pattern 2: Message Logger
```javascript
const logs = [];

realtime.on('message', (data) => {
  logs.push({
    timestamp: new Date().toISOString(),
    from: data.message.from_user_id,
    text: data.message.text
  });
  
  if (logs.length % 10 === 0) {
    fs.writeFileSync('logs.json', JSON.stringify(logs));
  }
});
```

### Pattern 3: Rate Limiting
```javascript
const userLastSeen = new Map();

realtime.on('message', async (data) => {
  const userId = data.message.from_user_id;
  
  // Only reply once per user per minute
  if (userLastSeen.has(userId) && 
      Date.now() - userLastSeen.get(userId) < 60000) {
    return;
  }
  
  userLastSeen.set(userId, Date.now());
  
  await realtime.directCommands.sendTextViaRealtime(
    data.message.thread_id,
    'Rate limited reply'
  );
});
```

---

## Summary

**3 Steps to Send/Receive Messages:**

1. **Login:** `await ig.login({ username, password })`
2. **Connect:** `await realtime.connect({ irisData: inbox, ... })`
3. **Send:** `await realtime.directCommands.sendTextViaRealtime(threadId, 'Message')`

That's it! The library handles all the MQTT, encryption, and protocol stuff behind the scenes.

---

## Need Help?

- 📦 npm: https://npmjs.com/package/nodejs-insta-private-api
- 🐙 GitHub: https://github.com/Kunboruto20/nodejs-insta-private-api
- 📖 Full Docs: In the README at npm package
