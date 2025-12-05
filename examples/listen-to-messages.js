const { IgApiClient, RealtimeClient } = require('../dist/index');
const fs = require('fs');
const path = require('path');

// Listen to Instagram Direct Messages in Real-Time
// Setup: export INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD, INSTAGRAM_EMAIL
// Run: node examples/listen-to-messages.js

async function main() {
  const username = process.env.INSTAGRAM_USERNAME;
  const password = process.env.INSTAGRAM_PASSWORD;
  const email = process.env.INSTAGRAM_EMAIL;
  
  if (!username || !password || !email) {
    console.error('Missing credentials!');
    console.error('Set: INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD, INSTAGRAM_EMAIL');
    process.exit(1);
  }

  try {
    console.log('\n📱 Instagram Direct Messages Listener\n');
    
    const ig = new IgApiClient();
    
    // Try to load saved session
    const sessionFile = path.join(__dirname, '../.session');
    if (fs.existsSync(sessionFile)) {
      console.log('Loading saved session...');
      const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      await ig.loadSession(session);
    } else {
      console.log('Logging in...');
      await ig.login({ username, password, email });
      const session = await ig.saveSession();
      fs.writeFileSync(sessionFile, JSON.stringify(session));
    }
    
    console.log(`✓ Logged in as @${username}\n`);
    
    const realtime = new RealtimeClient(ig);
    
    realtime.on('connected', () => {
      console.log('✓ Connected to MQTT\n');
      console.log('Waiting for messages... (send a DM to yourself)\n');
    });
    
    realtime.on('receive', (topic, messages) => {
      if (Array.isArray(messages)) {
        messages.forEach(msg => {
          if (msg.body) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`From: ${msg.from_user_id}`);
            console.log(`Message: ${msg.body}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━\n');
          }
          if (msg.message_data?.body) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`From: ${msg.from_user_id}`);
            console.log(`Message: ${msg.message_data.body}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━\n');
          }
        });
      }
    });
    
    realtime.on('error', (error) => {
      console.error('✗ Error:', error.message);
    });
    
    console.log('Connecting to Instagram MQTT...');
    
    await realtime.connect({
      graphQlSubs: ['ig_sub_direct'],
      irisData: null
    });
    
    console.log('Press Ctrl+C to stop\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
