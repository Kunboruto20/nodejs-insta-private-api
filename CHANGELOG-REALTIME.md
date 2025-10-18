# Changelog - Realtime MQTT Module

## [4.5.0] - 2024-12-19

### ✨ New Features

#### Realtime MQTT Service
- **New RealtimeService class** - Complete MQTT integration for Instagram realtime events
- **MQTT v3.1.1 support** - Compatible with Facebook's MQTT broker
- **TLS security** - All connections encrypted via port 443
- **Auto-reconnection** - Exponential backoff with configurable retry attempts
- **Event-driven architecture** - Extensible event system for realtime data

#### MQTT Topics Support
- `/fbns_msg` - Push notifications from Instagram
- `/ig_message` - Direct messages in real-time
- `/ig_presence` - User online/offline status updates
- `/ig_typing` - Typing indicators in conversations
- `/ig_activity` - Activity notifications and updates

#### Client Integration
- **New methods in IgApiClient**:
  - `connectRealtime()` - Connect to MQTT broker
  - `disconnectRealtime()` - Disconnect from MQTT broker
  - `isRealtimeConnected()` - Check connection status
  - `pingRealtime()` - Send ping to broker
  - `getRealtimeStats()` - Get connection statistics
  - `setRealtimeReconnectOptions()` - Configure reconnection behavior

#### Event System
- **Generic events**:
  - `realtimeEvent` - All realtime messages
  - `connected` - MQTT connection established
  - `disconnected` - MQTT connection lost
  - `reconnecting` - Reconnection in progress
  - `offline` - Client offline
  - `error` - MQTT errors
  - `maxReconnectAttemptsReached` - Max retries exceeded

- **Specific events**:
  - `pushNotification` - Push notifications
  - `directMessage` - Direct messages
  - `presenceUpdate` - Presence changes
  - `typingIndicator` - Typing status
  - `activityNotification` - Activity updates
  - `unknownMessage` - Unknown topic messages

### 🔧 Technical Details

#### Dependencies
- Added `mqtt@^5.14.1` for MQTT client functionality
- No breaking changes to existing dependencies

#### Configuration
- **Broker**: `mqtt-mini.facebook.com:443`
- **Protocol**: MQTT v3.1.1 over TLS
- **Username**: `fbns`
- **Password**: Instagram authorization token from session
- **Client ID**: Auto-generated `android-{uuid}` format
- **Keepalive**: 60 seconds
- **Clean Session**: false (for persistence)

#### Security
- All connections use TLS encryption
- Authorization token from Instagram session
- Unique client ID per connection
- Secure reconnection with token validation

### 📚 Documentation
- **REALTIME.md** - Complete realtime module documentation
- **realtime-example.js** - Working example with event handling
- **test-realtime.js** - Integration tests
- Updated README.md with realtime section

### 🧪 Testing
- Syntax validation for all files
- Integration tests for client methods
- Event system testing
- Import/export validation
- Zero breaking changes to existing functionality

### 🔄 Backward Compatibility
- **100% backward compatible** - No changes to existing API
- **Optional feature** - Realtime must be explicitly enabled
- **No impact** on existing code - All current functionality preserved
- **Additive only** - Only new methods and services added

### 📦 File Structure
```
dist/
├── services/
│   └── realtime.service.js    # New MQTT service
├── core/
│   └── client.js              # Updated with realtime methods
└── index.js                   # Updated exports

realtime-example.js            # Usage example
test-realtime.js              # Integration tests
REALTIME.md                   # Documentation
CHANGELOG-REALTIME.md         # This file
```

### 🚀 Usage Example
```javascript
const { IgApiClient } = require('nodejs-insta-private-api');

const ig = new IgApiClient();
await ig.login({ username, password });
await ig.connectRealtime();

ig.realtime.on('directMessage', (payload) => {
  console.log('New DM:', payload);
});
```

### ⚠️ Important Notes
- Requires valid Instagram session for MQTT connection
- MQTT connection is optional and separate from main API
- Respects Instagram's rate limits and ToS
- Use responsibly and follow platform guidelines

### 🎯 Future Enhancements
- Advanced payload parsing
- Connection health monitoring
- Load balancing support
- Performance metrics
- Custom topic subscriptions