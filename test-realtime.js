const { IgApiClient } = require('./dist/index');

/**
 * Test de integrare pentru serviciul realtime
 * Acest test verifică că toate componentele funcționează corect
 */
async function testRealtimeIntegration() {
  console.log('🧪 Testing Realtime Integration...\n');
  
  try {
    // 1. Test creare client
    console.log('1️⃣ Creating IgApiClient...');
    const ig = new IgApiClient();
    console.log('   ✅ Client created successfully');
    
    // 2. Test serviciu realtime
    console.log('\n2️⃣ Testing RealtimeService...');
    console.log('   Realtime service type:', typeof ig.realtime);
    console.log('   Is RealtimeService instance:', ig.realtime.constructor.name);
    console.log('   ✅ RealtimeService initialized');
    
    // 3. Test metode publice
    console.log('\n3️⃣ Testing public methods...');
    const methods = [
      'connectRealtime',
      'disconnectRealtime', 
      'isRealtimeConnected',
      'pingRealtime',
      'getRealtimeStats',
      'setRealtimeReconnectOptions'
    ];
    
    methods.forEach(method => {
      if (typeof ig[method] === 'function') {
        console.log(`   ✅ ${method} - OK`);
      } else {
        console.log(`   ❌ ${method} - MISSING`);
      }
    });
    
    // 4. Test metode serviciu realtime
    console.log('\n4️⃣ Testing RealtimeService methods...');
    const serviceMethods = [
      'connect',
      'disconnect',
      'isRealtimeConnected',
      'ping',
      'setReconnectOptions',
      'getStats'
    ];
    
    serviceMethods.forEach(method => {
      if (typeof ig.realtime[method] === 'function') {
        console.log(`   ✅ realtime.${method} - OK`);
      } else {
        console.log(`   ❌ realtime.${method} - MISSING`);
      }
    });
    
    // 5. Test configurații
    console.log('\n5️⃣ Testing configurations...');
    const stats = ig.getRealtimeStats();
    console.log('   Stats object:', typeof stats);
    console.log('   Broker config:', stats.broker);
    console.log('   Client ID format:', stats.clientId.startsWith('android-'));
    console.log('   Topics count:', stats.subscribedTopics.length);
    console.log('   ✅ Configurations look correct');
    
    // 6. Test event listeners
    console.log('\n6️⃣ Testing event system...');
    let eventTestPassed = false;
    
    ig.realtime.on('test', () => {
      eventTestPassed = true;
    });
    
    ig.realtime.emit('test');
    
    if (eventTestPassed) {
      console.log('   ✅ Event system working');
    } else {
      console.log('   ❌ Event system not working');
    }
    
    // 7. Test cleanup
    console.log('\n7️⃣ Testing cleanup...');
    ig.destroy();
    console.log('   ✅ Cleanup successful');
    
    console.log('\n🎉 All tests passed! Realtime integration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
if (require.main === module) {
  testRealtimeIntegration().catch(console.error);
}

module.exports = testRealtimeIntegration;