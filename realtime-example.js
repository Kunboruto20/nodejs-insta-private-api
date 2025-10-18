const { IgApiClient } = require('./dist/index');
const fs = require('fs');

/**
 * Instagram Realtime MQTT Example
 * 
 * This example demonstrates how to:
 * 1. Connect to Instagram
 * 2. Enable the new realtime MQTT service
 * 3. Listen for real-time events using the correct topics and endpoints
 * 4. Handle errors and reconnection
 */
async function realtimeExample() {
  const ig = new IgApiClient();
  
  try {
    console.log('🚀 Starting Instagram Realtime MQTT Example...\n');
    
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    console.log('📝 1. Authentication');
    
    // Check if we have a saved session
    const sessionFile = 'session.json';
    let loggedIn = false;
    
    if (fs.existsSync(sessionFile)) {
      console.log('   📁 Loading saved session...');
      try {
        const session = JSON.parse(fs.readFileSync(sessionFile));
        await ig.loadSession(session);
        
        if (await ig.isSessionValid()) {
          console.log('   ✅ Session is valid!');
          loggedIn = true;
        } else {
          console.log('   ❌ Session expired, need to login again');
        }
      } catch (error) {
        console.log('   ❌ Failed to load session:', error.message);
      }
    }
    
    // Login if not already logged in
    if (!loggedIn) {
      console.log('   🔐 Logging in...');
      
      // REPLACE WITH YOUR CREDENTIALS
      const credentials = {
        username: 'your_username',
        password: 'your_password',
        email: 'your_email@example.com'
      };
      
      try {
        await ig.login(credentials);
        console.log('   ✅ Login successful!');
        
        // Save session for future use
        const session = await ig.saveSession();
        fs.writeFileSync(sessionFile, JSON.stringify(session));
        console.log('   💾 Session saved!');
        
      } catch (error) {
        console.log('   ❌ Login failed:', error.message);
        return;
      }
    }
    
    // ============================================
    // 2. REALTIME MQTT CONNECTION
    // ============================================
    console.log('\n📡 2. Realtime MQTT Connection');
    
    // Configure realtime reconnection options
    ig.setRealtimeReconnectOptions({
      maxAttempts: 5,
      delay: 3000
    });
    
    // Set up event listeners for realtime events
    setupRealtimeEventListeners(ig);
    
    // Connect to MQTT broker
    console.log('   🔌 Connecting to MQTT broker (edge-mqtt.facebook.com)...');
    try {
      await ig.connectRealtime();
      console.log('   ✅ Connected to MQTT broker!');
      
      // Show realtime stats
      const stats = ig.getRealtimeStats();
      console.log('   📊 Realtime Stats:', JSON.stringify(stats, null, 2));
      
    } catch (error) {
      console.log('   ❌ Failed to connect to MQTT:', error.message);
      return;
    }
    
    // ============================================
    // 3. REALTIME EVENT HANDLING
    // ============================================
    console.log('\n👂 3. Listening for Realtime Events');
    console.log('   📱 Listening for:');
    console.log('   - GraphQL messages (/graphql)');
    console.log('   - Pub/Sub messages (/pubsub)');
    console.log('   - Message sync (/ig_message_sync)');
    console.log('   - Send message responses (/ig_send_message_response)');
    console.log('   - Iris subscriptions (/ig_sub_iris_response)');
    console.log('   - Region hints (/t_region_hint)');
    console.log('   - Realtime subscriptions (/ig_realtime_sub)');
    console.log('\n   ⏳ Waiting for events... (Press Ctrl+C to stop)');
    
    // Keep the process running to listen for events
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      
      // Disconnect realtime
      if (ig.isRealtimeConnected()) {
        console.log('   📡 Disconnecting from MQTT...');
        ig.disconnectRealtime();
      }
      
      // Clean up
      ig.destroy();
      console.log('   ✅ Cleanup complete. Goodbye!');
      process.exit(0);
    });
    
    // Keep alive - ping every 30 seconds
    setInterval(() => {
      if (ig.isRealtimeConnected()) {
        ig.pingRealtime();
      }
    }, 30000);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Full error:', error);
  }
}

/**
 * Set up event listeners for the realtime service
 * @param {IgApiClient} ig - Instagram client
 */
function setupRealtimeEventListeners(ig) {
  // Generic realtime event
  ig.realtime.on('realtimeEvent', (event) => {
    console.log(`\n📨 [${event.timestamp}] Realtime Event:`);
    console.log(`   Topic: ${event.topic} (ID: ${event.topicId})`);
    console.log(`   Data: ${JSON.stringify(event.data, null, 2)}`);
  });
  
  // Specific event types
  ig.realtime.on('graphqlMessage', (data) => {
    console.log('\n🔍 GraphQL Message:', JSON.stringify(data, null, 2));
  });
  
  ig.realtime.on('pubsubMessage', (data) => {
    console.log('\n📢 Pub/Sub Message:', JSON.stringify(data, null, 2));
  });
  
  ig.realtime.on('messageSync', (data) => {
    console.log('\n💬 Message Sync:', JSON.stringify(data, null, 2));
  });
  
  ig.realtime.on('sendMessageResponse', (data) => {
    console.log('\n📤 Send Message Response:', JSON.stringify(data, null, 2));
  });
  
  ig.realtime.on('irisSubResponse', (data) => {
    console.log('\n👁️ Iris Subscription Response:', JSON.stringify(data, null, 2));
  });
  
  ig.realtime.on('regionHint', (data) => {
    console.log('\n🌍 Region Hint:', JSON.stringify(data, null, 2));
  });
  
  ig.realtime.on('realtimeSub', (data) => {
    console.log('\n📡 Realtime Subscription:', JSON.stringify(data, null, 2));
  });
  
  ig.realtime.on('foregroundState', (data) => {
    console.log('\n📱 Foreground State:', JSON.stringify(data, null, 2));
  });
  
  ig.realtime.on('sendMessage', (data) => {
    console.log('\n📨 Send Message:', JSON.stringify(data, null, 2));
  });
  
  // Connection events
  ig.realtime.on('connected', () => {
    console.log('   ✅ MQTT Connected');
  });
  
  ig.realtime.on('disconnected', () => {
    console.log('   ❌ MQTT Disconnected');
  });
  
  ig.realtime.on('reconnecting', () => {
    console.log('   🔄 MQTT Reconnecting...');
  });
  
  ig.realtime.on('offline', () => {
    console.log('   📴 MQTT Offline');
  });
  
  ig.realtime.on('error', (error) => {
    console.error('   ❌ MQTT Error:', error.message);
  });
  
  ig.realtime.on('maxReconnectAttemptsReached', () => {
    console.error('   ❌ Max reconnect attempts reached');
  });
  
  ig.realtime.on('ping', () => {
    console.log('   🏓 MQTT Ping sent');
  });
}

// Run the example
if (require.main === module) {
  console.log('====================================');
  console.log('📡 Instagram Realtime MQTT Example');
  console.log('====================================');
  console.log('');
  console.log('⚠️  IMPORTANT NOTES:');
  console.log('1. Replace credentials with your own');
  console.log('2. Make sure you have a valid Instagram session');
  console.log('3. Uses the correct endpoint: edge-mqtt.facebook.com');
  console.log('4. Supports all Instagram realtime topics');
  console.log('5. Use responsibly and follow Instagram ToS');
  console.log('');
  
  realtimeExample().catch(console.error);
}

module.exports = realtimeExample;