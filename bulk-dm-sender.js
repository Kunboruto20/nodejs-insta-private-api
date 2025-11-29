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
    console.log('║     📱 Instagram Bulk DM Sender - MQTT v5.57.9           ║');
    console.log('║         Infinite Loop Mode - Continuous Sending           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('🔐 Enter your Instagram credentials:\n');
    const username = await question('📧 Username: ');
    const password = await question('🔑 Password: ');
    const email = await question('📨 Email (press Enter to skip): ');

    console.log('\n⏳ Authenticating...');
    
    let ig = new IgApiClient();
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

    console.log('✅ Logged in!\n');

    console.log('📋 Fetching inbox via MQTT...');
    const inbox = await ig.direct.getInbox();
    const threads = inbox.inbox.threads;
    
    console.log(`✅ Got ${threads.length} conversations\n`);

    const realtime = new RealtimeClient(ig);
    
    console.log('🔌 Connecting to MQTT...');
    await realtime.connect({
      graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
      skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
      irisData: inbox
    });

    console.log('✅ Connected to MQTT!\n');

    console.log('👂 Listening for incoming messages:\n');
    let messageCount = 0;

    realtime.on('message', (data) => {
      const msg = data.message;
      if (!msg?.text || msg.text === 'no text') return;

      messageCount++;
      console.log(`📨 [#${messageCount}] From ${msg.from_user_id}: ${msg.text.substring(0, 40)}...`);
    });

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                     📊 AVAILABLE GROUPS                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    threads.forEach((thread, index) => {
      const threadName = thread.thread_title || `Group ${index + 1}`;
      const userCount = thread.users ? thread.users.length : 0;
      console.log(`  ${index + 1}. ${threadName} (${userCount} users)`);
    });

    console.log();

    const selectedInput = await question('📍 Enter group numbers (comma-separated, e.g., 1,2,3): ');
    const selectedIndexes = selectedInput
      .split(',')
      .map(s => parseInt(s.trim()) - 1)
      .filter(i => i >= 0 && i < threads.length);

    if (selectedIndexes.length === 0) {
      console.log('❌ No valid groups selected');
      process.exit(1);
    }

    const selectedThreads = selectedIndexes.map(i => threads[i]);
    
    console.log(`\n✅ Selected ${selectedThreads.length} group(s):`);
    selectedThreads.forEach((t, i) => {
      const name = t.thread_title || `Group ${i + 1}`;
      console.log(`  ${i + 1}. ${name}`);
    });
    console.log();

    const textFilePath = await question('📄 Enter text file path (e.g., messages.txt): ');
    
    if (!fs.existsSync(textFilePath)) {
      console.error(`❌ File not found: ${textFilePath}`);
      process.exit(1);
    }

    const messageText = fs.readFileSync(textFilePath, 'utf8');
    console.log(`✅ Loaded ${messageText.length} characters from file\n`);

    const delayInput = await question('⏱️  Enter delay between messages (seconds): ');
    const delaySeconds = parseInt(delayInput);

    if (isNaN(delaySeconds) || delaySeconds < 0) {
      console.error('❌ Invalid delay value');
      process.exit(1);
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              🚀 INFINITE LOOP MODE STARTED                 ║');
    console.log('║                                                            ║');
    console.log('║  Sending messages continuously...                          ║');
    console.log('║  Press Ctrl+C to stop                                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    let roundCount = 0;
    let totalSent = 0;
    let totalFailed = 0;

    // INFINITE LOOP
    while (true) {
      roundCount++;
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🔄 ROUND #${roundCount} - ${new Date().toLocaleTimeString()}`);
      console.log(`${'═'.repeat(60)}\n`);

      let roundSent = 0;
      let roundFailed = 0;

      for (let i = 0; i < selectedThreads.length; i++) {
        const thread = selectedThreads[i];
        const threadName = thread.thread_title || `Group ${i + 1}`;
        
        console.log(`📤 [${i + 1}/${selectedThreads.length}] Sending to: ${threadName}`);
        console.log(`   Text: ${messageText.substring(0, 50)}...`);
        
        try {
          await realtime.directCommands.sendTextViaRealtime(
            thread.thread_id,
            messageText
          );
          roundSent++;
          totalSent++;
          console.log(`   ✅ Sent!\n`);
        } catch (err) {
          roundFailed++;
          totalFailed++;
          console.log(`   ❌ Failed: ${err.message}\n`);
        }

        if (i < selectedThreads.length - 1 && delaySeconds > 0) {
          console.log(`   ⏳ Waiting ${delaySeconds} second(s)...\n`);
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      }

      console.log(`\n📊 Round Summary:`);
      console.log(`  ✅ Sent this round: ${roundSent}`);
      console.log(`  ❌ Failed this round: ${roundFailed}`);
      console.log(`  📈 Total sent overall: ${totalSent}`);
      console.log(`  📈 Total failed overall: ${totalFailed}`);

      console.log(`\n⏳ Waiting ${delaySeconds} second(s) before next round...\n`);
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
