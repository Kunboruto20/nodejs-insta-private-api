#!/usr/bin/env node
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { IgApiClient, RealtimeClient } = require('./dist/index.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     📱 Instagram DM Bot - Interactive Mode v5.57.8        ║');
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
