const { IgApiClient } = require('./dist/index');
const fs = require('fs');

/**
 * Exemplu de utilizare a serviciului realtime MQTT îmbunătățit
 * 
 * Acest exemplu demonstrează cum să:
 * 1. Te conectezi la Instagram
 * 2. Activezi serviciul realtime MQTT îmbunătățit
 * 3. Asculți evenimente în timp real cu stabilitate îmbunătățită
 * 4. Gestionezi erorile și reconectarea automată
 */
async function enhancedRealtimeExample() {
  const ig = new IgApiClient();
  
  try {
    console.log('🚀 Starting Instagram Enhanced Realtime MQTT Example...\n');
    
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
    // 2. ENHANCED REALTIME MQTT CONNECTION
    // ============================================
    console.log('\n📡 2. Enhanced Realtime MQTT Connection');
    
    // Configure enhanced realtime options
    ig.setEnhancedRealtimeReconnectOptions({
      maxAttempts: 10,
      delay: 5000
    });
    
    // Set ping interval to 30 seconds
    ig.setEnhancedRealtimePingInterval(30000);
    
    // Set fallback polling interval to 10 seconds
    ig.setEnhancedRealtimeFallbackPollingInterval(10000);
    
    // Set up event listeners for enhanced realtime events
    setupEnhancedRealtimeEventListeners(ig);
    
    // Connect to enhanced MQTT broker
    console.log('   🔌 Connecting to enhanced MQTT broker...');
    try {
      await ig.connectEnhancedRealtime();
      console.log('   ✅ Connected to enhanced MQTT broker!');
      
      // Show enhanced realtime stats
      const stats = ig.getEnhancedRealtimeStats();
      console.log('   📊 Enhanced Realtime Stats:', JSON.stringify(stats, null, 2));
      
    } catch (error) {
      console.log('   ❌ Failed to connect to enhanced MQTT:', error.message);
      return;
    }
    
    // ============================================
    // 3. ENHANCED REALTIME EVENT HANDLING
    // ============================================
    console.log('\n👂 3. Listening for Enhanced Realtime Events');
    console.log('   📱 Listening for:');
    console.log('   - Push notifications (/fbns_msg)');
    console.log('   - Direct messages (/ig_message)');
    console.log('   - Presence updates (/ig_presence)');
    console.log('   - Typing indicators (/ig_typing)');
    console.log('   - Activity notifications (/ig_activity)');
    console.log('\n   🛡️ Enhanced features:');
    console.log('   - Automatic reconnection with exponential backoff');
    console.log('   - Periodic ping to maintain connection');
    console.log('   - Fallback polling mode if MQTT fails');
    console.log('   - Robust error handling');
    console.log('\n   ⏳ Waiting for events... (Press Ctrl+C to stop)');
    
    // Keep the process running to listen for events
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      
      // Disconnect enhanced realtime
      if (ig.isEnhancedRealtimeConnected()) {
        console.log('   📡 Disconnecting from enhanced MQTT...');
        ig.disconnectEnhancedRealtime();
      }
      
      // Clean up
      ig.destroy();
      console.log('   ✅ Cleanup complete. Goodbye!');
      process.exit(0);
    });
    
    // Keep alive - ping every 30 seconds (handled automatically by enhanced service)
    console.log('   🏓 Ping interval: 30 seconds (automatic)');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Full error:', error);
  }
}

/**
 * Configurează event listener-ii pentru serviciul realtime îmbunătățit
 * @param {IgApiClient} ig - Clientul Instagram
 */
function setupEnhancedRealtimeEventListeners(ig) {
  // Event generic pentru toate evenimentele realtime
  ig.enhancedRealtime.on('realtimeEvent', (event) => {
    console.log(`\n📨 [${event.timestamp}] Enhanced Realtime Event:`);
    console.log(`   Topic: ${event.topic}`);
    console.log(`   Payload: ${JSON.stringify(event.payload, null, 2)}`);
  });
  
  // Event-uri specifice pentru fiecare tip de mesaj
  ig.enhancedRealtime.on('pushNotification', (payload) => {
    console.log('\n🔔 Push Notification:', JSON.stringify(payload, null, 2));
  });
  
  ig.enhancedRealtime.on('directMessage', (payload) => {
    console.log('\n💬 Direct Message:', JSON.stringify(payload, null, 2));
  });
  
  ig.enhancedRealtime.on('presenceUpdate', (payload) => {
    console.log('\n👤 Presence Update:', JSON.stringify(payload, null, 2));
  });
  
  ig.enhancedRealtime.on('typingIndicator', (payload) => {
    console.log('\n⌨️ Typing Indicator:', JSON.stringify(payload, null, 2));
  });
  
  ig.enhancedRealtime.on('activityNotification', (payload) => {
    console.log('\n🎯 Activity Notification:', JSON.stringify(payload, null, 2));
  });
  
  // Event-uri de conexiune
  ig.enhancedRealtime.on('connected', () => {
    console.log('   ✅ Enhanced MQTT Connected');
  });
  
  ig.enhancedRealtime.on('disconnected', () => {
    console.log('   ❌ Enhanced MQTT Disconnected');
  });
  
  ig.enhancedRealtime.on('reconnecting', (data) => {
    console.log(`   🔄 Enhanced MQTT Reconnecting... (attempt ${data.attempt}/${data.maxAttempts})`);
  });
  
  ig.enhancedRealtime.on('offline', () => {
    console.log('   📴 Enhanced MQTT Offline');
  });
  
  ig.enhancedRealtime.on('error', (error) => {
    console.error('   ❌ Enhanced MQTT Error:', error.message);
  });
  
  ig.enhancedRealtime.on('ping', () => {
    console.log('   🏓 Enhanced MQTT Ping sent');
  });
  
  // Event-uri pentru fallback mode
  ig.enhancedRealtime.on('fallbackModeEnabled', () => {
    console.log('   🔄 Fallback mode enabled - switching to polling');
  });
  
  ig.enhancedRealtime.on('fallbackModeDisabled', () => {
    console.log('   ✅ Fallback mode disabled - back to MQTT');
  });
  
  ig.enhancedRealtime.on('fallbackPolling', () => {
    console.log('   📡 Fallback polling...');
  });
}

// Run the example
if (require.main === module) {
  console.log('====================================');
  console.log('📡 Instagram Enhanced Realtime MQTT Example');
  console.log('====================================');
  console.log('');
  console.log('⚠️  IMPORTANT NOTES:');
  console.log('1. Replace credentials with your own');
  console.log('2. Make sure you have a valid Instagram session');
  console.log('3. The enhanced MQTT connection provides better stability');
  console.log('4. Features automatic reconnection and ping intervals');
  console.log('5. Includes fallback polling mode if MQTT fails');
  console.log('6. Use responsibly and follow Instagram ToS');
  console.log('');
  
  enhancedRealtimeExample().catch(console.error);
}

module.exports = enhancedRealtimeExample;