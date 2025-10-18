const { IgApiClient } = require('./dist/index');
const fs = require('fs');

/**
 * Exemplu de utilizare a serviciului realtime MQTT
 * 
 * Acest exemplu demonstrează cum să:
 * 1. Te conectezi la Instagram
 * 2. Activezi serviciul realtime MQTT
 * 3. Asculți evenimente în timp real
 * 4. Gestionezi erorile și reconectarea
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
    console.log('   🔌 Connecting to MQTT broker...');
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
    console.log('   - Push notifications (/fbns_msg)');
    console.log('   - Direct messages (/ig_message)');
    console.log('   - Presence updates (/ig_presence)');
    console.log('   - Typing indicators (/ig_typing)');
    console.log('   - Activity notifications (/ig_activity)');
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
 * Configurează event listener-ii pentru serviciul realtime
 * @param {IgApiClient} ig - Clientul Instagram
 */
function setupRealtimeEventListeners(ig) {
  // Event generic pentru toate evenimentele realtime
  ig.realtime.on('realtimeEvent', (event) => {
    console.log(`\n📨 [${event.timestamp}] Realtime Event:`);
    console.log(`   Topic: ${event.topic}`);
    console.log(`   Payload: ${JSON.stringify(event.payload, null, 2)}`);
  });
  
  // Event-uri specifice pentru fiecare tip de mesaj
  ig.realtime.on('pushNotification', (payload) => {
    console.log('\n🔔 Push Notification:', JSON.stringify(payload, null, 2));
  });
  
  ig.realtime.on('directMessage', (payload) => {
    console.log('\n💬 Direct Message:', JSON.stringify(payload, null, 2));
  });
  
  ig.realtime.on('presenceUpdate', (payload) => {
    console.log('\n👤 Presence Update:', JSON.stringify(payload, null, 2));
  });
  
  ig.realtime.on('typingIndicator', (payload) => {
    console.log('\n⌨️ Typing Indicator:', JSON.stringify(payload, null, 2));
  });
  
  ig.realtime.on('activityNotification', (payload) => {
    console.log('\n🎯 Activity Notification:', JSON.stringify(payload, null, 2));
  });
  
  // Event-uri de conexiune
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
  console.log('3. The MQTT connection simulates Instagram app behavior');
  console.log('4. Use responsibly and follow Instagram ToS');
  console.log('');
  
  realtimeExample().catch(console.error);
}

module.exports = realtimeExample;