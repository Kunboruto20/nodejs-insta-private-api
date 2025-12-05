const readline = require('readline');
const fs = require('fs');
const chalk = require('chalk');
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

const questionPassword = () => new Promise((resolve) => {
  process.stdout.write(chalk.yellow('🔑 Password: '));
  process.stdin.setRawMode(true);
  let password = '';
  
  process.stdin.on('data', (byte) => {
    const char = String.fromCharCode(byte);
    if (char === '\n' || char === '\r') {
      process.stdin.setRawMode(false);
      console.log();
      resolve(password);
      process.stdin.removeAllListeners('data');
    } else if (char === '\u0003') {
      process.exit();
    } else if (char === '\u007f') {
      password = password.slice(0, -1);
      process.stdout.write('\b \b');
    } else {
      password += char;
      process.stdout.write('*');
    }
  });
});

(async () => {
  try {
    console.clear();
    console.log(chalk.red.bold('\n╔═══════════════════════════════════════════════════════════╗'));
    console.log(chalk.red.bold('║                                                           ║'));
    console.log(chalk.red.bold('║         🤖 Instagram MQTT Message Sender 🤖              ║'));
    console.log(chalk.red.bold('║                                                           ║'));
    console.log(chalk.red.bold('║     Real-time MQTT Infinite Loop Messaging               ║'));
    console.log(chalk.red.bold('║                                                           ║'));
    console.log(chalk.red.bold('╚═══════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.cyan('📋 Fetching inbox... Please wait...\n'));
    
    const username = await question(chalk.yellow('📧 Username: '));
    const password = await questionPassword();
    const email = await question(chalk.yellow('📨 Email (press Enter to skip): '));

    console.log(chalk.cyan('\n⏳ Authenticating...'));
    
    let ig = new IgApiClient();
    
    try {
      await ig.login({
        username: username,
        password: password,
        email: email || undefined
      });
      console.log(chalk.green('✅ Logged in successfully!\n'));
    } catch (err) {
      console.error(chalk.red('❌ Login failed:', err.message));
      process.exit(1);
    }

    console.log(chalk.cyan('📋 Fetching inbox...'));
    
    let inbox;
    try {
      inbox = await ig.direct.getInbox();
    } catch (err) {
      console.error(chalk.red('❌ Failed to fetch inbox:', err.message));
      process.exit(1);
    }
    
    const threads = inbox.inbox.threads;
    console.log(chalk.green(`✅ Got ${threads.length} conversations\n`));

    console.log(chalk.cyan('🔌 Connecting to MQTT...'));
    
    const realtime = new RealtimeClient(ig);
    
    try {
      await realtime.connect({
        graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
        skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
        irisData: inbox
      });
    } catch (err) {
      console.error(chalk.red('❌ Failed to connect to MQTT:', err.message));
      process.exit(1);
    }

    console.log(chalk.green('✅ Connected to MQTT!\n'));

    console.log(chalk.cyan('👂 Listening for incoming messages:\n'));
    let messageCount = 0;

    realtime.on('message', (data) => {
      try {
        const msg = data.message;
        if (!msg?.text || msg.text === 'no text') return;
        messageCount++;
        console.log(chalk.yellow(`📨 [#${messageCount}] From ${msg.from_user_id}: ${msg.text.substring(0, 40)}...`));
      } catch (e) {}
    });

    console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║                   📊 AVAILABLE GROUPS                      ║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════╝\n'));

    threads.forEach((thread, index) => {
      const threadName = thread.thread_title || `Group ${index + 1}`;
      const userCount = thread.users ? thread.users.length : 0;
      console.log(chalk.white(`  ${index + 1}. ${threadName} (${userCount} users)`));
    });

    console.log();

    const selectedInput = await question(chalk.yellow('📍 Enter group numbers (1,2,3): '));
    const selectedIndexes = selectedInput
      .split(',')
      .map(s => parseInt(s.trim()) - 1)
      .filter(i => i >= 0 && i < threads.length);

    if (selectedIndexes.length === 0) {
      console.log(chalk.red('❌ No valid groups selected'));
      process.exit(1);
    }

    const selectedThreads = selectedIndexes.map(i => threads[i]);
    
    console.log(chalk.green(`\n✅ Selected ${selectedThreads.length} group(s):`));
    selectedThreads.forEach((t, i) => {
      const name = t.thread_title || `Group ${i + 1}`;
      console.log(chalk.white(`  ${i + 1}. ${name}`));
    });
    console.log();

    const textFilePath = await question(chalk.yellow('📄 Enter text file path: '));
    
    if (!fs.existsSync(textFilePath)) {
      console.error(chalk.red(`❌ File not found: ${textFilePath}`));
      process.exit(1);
    }

    const messageText = fs.readFileSync(textFilePath, 'utf8').trim();
    console.log(chalk.green(`✅ Loaded ${messageText.length} characters\n`));

    console.log(chalk.cyan('📮 Select sending mode:\n'));
    console.log(chalk.white('  1. Line by line (infinite loop)'));
    console.log(chalk.white('  2. Entire text as one message\n'));
    
    const modeInput = await question(chalk.yellow('Mode (1 or 2): '));
    const mode = parseInt(modeInput);

    if (![1, 2].includes(mode)) {
      console.error(chalk.red('❌ Invalid option'));
      process.exit(1);
    }

    const delayInput = await question(chalk.yellow('⏱️  Delay between messages (seconds): '));
    const delaySeconds = parseInt(delayInput);

    if (isNaN(delaySeconds) || delaySeconds < 0) {
      console.error(chalk.red('❌ Invalid delay'));
      process.exit(1);
    }

    rl.close();

    console.log(chalk.red.bold('\n╔═══════════════════════════════════════════════════════════╗'));
    console.log(chalk.red.bold('║           🚀 INFINITE LOOP MODE STARTED                  ║'));
    console.log(chalk.red.bold('║                                                          ║'));
    console.log(chalk.red.bold('║  Sending messages continuously...                        ║'));
    console.log(chalk.red.bold('║  Press Ctrl+C to stop                                    ║'));
    console.log(chalk.red.bold('╚═══════════════════════════════════════════════════════════╝\n'));

    let roundCount = 0;
    let totalSent = 0;
    let totalFailed = 0;

    if (mode === 1) {
      const lines = messageText.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length === 0) {
        console.error(chalk.red('❌ No lines found'));
        process.exit(1);
      }

      console.log(chalk.cyan(`Found ${lines.length} lines\n`));

      while (true) {
        roundCount++;
        console.log(chalk.red(`\n${'═'.repeat(60)}`));
        console.log(chalk.red(`🔄 ROUND #${roundCount} - ${new Date().toLocaleTimeString()}`));
        console.log(chalk.red(`${'═'.repeat(60)}\n`));

        let roundSent = 0;
        let roundFailed = 0;

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];

          for (let i = 0; i < selectedThreads.length; i++) {
            const thread = selectedThreads[i];
            const threadName = thread.thread_title || `Group ${i + 1}`;
            
            console.log(chalk.yellow(`📤 [Line ${lineIdx + 1}/${lines.length}][Group ${i + 1}/${selectedThreads.length}] ${threadName}`));
            console.log(chalk.white(`   ${line.substring(0, 50)}...`));
            
            try {
              await realtime.directCommands.sendTextViaRealtime(thread.thread_id, line);
              roundSent++;
              totalSent++;
              console.log(chalk.green(`   ✅ Sent!\n`));
            } catch (err) {
              roundFailed++;
              totalFailed++;
              console.log(chalk.red(`   ❌ ${err.message}\n`));
            }

            if ((lineIdx < lines.length - 1 || i < selectedThreads.length - 1) && delaySeconds > 0) {
              console.log(chalk.cyan(`   ⏳ ${delaySeconds}s...\n`));
              await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            }
          }
        }

        console.log(chalk.red(`📊 ✅ Sent: ${roundSent} | ❌ Failed: ${roundFailed} | 📈 Total: ${totalSent}/${totalSent + totalFailed}\n`));
        console.log(chalk.cyan(`⏳ Next round in ${delaySeconds}s...\n`));
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }

    } else {
      while (true) {
        roundCount++;
        console.log(chalk.red(`\n${'═'.repeat(60)}`));
        console.log(chalk.red(`🔄 ROUND #${roundCount} - ${new Date().toLocaleTimeString()}`));
        console.log(chalk.red(`${'═'.repeat(60)}\n`));

        let roundSent = 0;
        let roundFailed = 0;

        for (let i = 0; i < selectedThreads.length; i++) {
          const thread = selectedThreads[i];
          const threadName = thread.thread_title || `Group ${i + 1}`;
          
          console.log(chalk.yellow(`📤 [${i + 1}/${selectedThreads.length}] ${threadName}`));
          console.log(chalk.white(`   ${messageText.substring(0, 50)}...`));
          
          try {
            await realtime.directCommands.sendTextViaRealtime(thread.thread_id, messageText);
            roundSent++;
            totalSent++;
            console.log(chalk.green(`   ✅ Sent!\n`));
          } catch (err) {
            roundFailed++;
            totalFailed++;
            console.log(chalk.red(`   ❌ ${err.message}\n`));
          }

          if (i < selectedThreads.length - 1 && delaySeconds > 0) {
            console.log(chalk.cyan(`   ⏳ ${delaySeconds}s...\n`));
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
          }
        }

        console.log(chalk.red(`📊 ✅ Sent: ${roundSent} | ❌ Failed: ${roundFailed} | 📈 Total: ${totalSent}/${totalSent + totalFailed}\n`));
        console.log(chalk.cyan(`⏳ Next round in ${delaySeconds}s...\n`));
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Error:', error.message));
    process.exit(1);
  }
})();
