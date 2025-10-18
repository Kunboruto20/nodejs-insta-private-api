const EventEmitter = require('events');
const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');
const { Topics, RealtimeTopicsArray, REALTIME } = require('./topic');

/**
 * Instagram Realtime MQTT Service
 * 
 * Implements Instagram's realtime messaging system using MQTT
 * with the correct endpoint: edge-mqtt.facebook.com
 * 
 * @class RealtimeService
 * @extends EventEmitter
 */
class RealtimeService extends EventEmitter {
  constructor(client) {
    super();
    
    this.client = client;
    this.mqttClient = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
    this.keepalive = 60;
    this.cleanSession = false;
    
    // MQTT Configuration
    this.broker = REALTIME.HOST_NAME_V6;
    this.port = 443; // TLS
    this.protocol = 'mqtts';
    this.username = 'fbns';
    
    // Client ID generated
    this.clientId = `android-${uuidv4().replace(/-/g, '')}`;
    
    // Bind methods to preserve context
    this._onConnect = this._onConnect.bind(this);
    this._onMessage = this._onMessage.bind(this);
    this._onError = this._onError.bind(this);
    this._onClose = this._onClose.bind(this);
    this._onOffline = this._onOffline.bind(this);
    this._onReconnect = this._onReconnect.bind(this);
  }

  /**
   * Connect to MQTT broker
   * @returns {Promise<boolean>} True if connection succeeded
   */
  async connect() {
    if (this.isConnected || this.isConnecting) {
      return this.isConnected;
    }

    this.isConnecting = true;
    
    try {
      // Check if client is authenticated
      if (!this.client.isLoggedIn()) {
        throw new Error('Client must be logged in to use realtime service');
      }

      // Get authorization token from session
      const authToken = this._getAuthToken();
      if (!authToken) {
        throw new Error('No valid authorization token found in session');
      }

      // MQTT connection configuration
      const mqttOptions = {
        clientId: this.clientId,
        username: this.username,
        password: authToken,
        keepalive: this.keepalive,
        clean: this.cleanSession,
        reconnectPeriod: 0, // Disable automatic reconnection - we handle it manually
        connectTimeout: 30000,
        protocolVersion: 4, // MQTT v3.1.1
        rejectUnauthorized: true
      };

      // Broker URL
      const brokerUrl = `${this.protocol}://${this.broker}:${this.port}`;
      
      if (this.client.state.verbose) {
        console.log(`[Realtime] Connecting to MQTT broker: ${brokerUrl}`);
        console.log(`[Realtime] Client ID: ${this.clientId}`);
        console.log(`[Realtime] Username: ${this.username}`);
      }

      // Create MQTT connection
      this.mqttClient = mqtt.connect(brokerUrl, mqttOptions);

      // Configure event handlers
      this.mqttClient.on('connect', this._onConnect);
      this.mqttClient.on('message', this._onMessage);
      this.mqttClient.on('error', this._onError);
      this.mqttClient.on('close', this._onClose);
      this.mqttClient.on('offline', this._onOffline);
      this.mqttClient.on('reconnect', this._onReconnect);

      // Wait for connection
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false;
          reject(new Error('MQTT connection timeout'));
        }, 30000);

        this.mqttClient.once('connect', () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          resolve(true);
        });

        this.mqttClient.once('error', (err) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          reject(err);
        });
      });

    } catch (error) {
      this.isConnecting = false;
      if (this.client.state.verbose) {
        console.error('[Realtime] Connection failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect() {
    if (this.mqttClient && this.isConnected) {
      if (this.client.state.verbose) {
        console.log('[Realtime] Disconnecting from MQTT broker...');
      }
      
      this.mqttClient.end();
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Check if service is connected
   * @returns {boolean}
   */
  isRealtimeConnected() {
    return this.isConnected && this.mqttClient && this.mqttClient.connected;
  }

  /**
   * Send ping to broker
   */
  ping() {
    if (this.isRealtimeConnected()) {
      if (this.client.state.verbose) {
        console.log('[Realtime] Sending ping...');
      }
      // MQTT client handles ping automatically through keepalive
      // But we can emit an event for debugging
      this.emit('ping');
    }
  }

  /**
   * Get authorization token from session
   * @private
   */
  _getAuthToken() {
    try {
      // Try to get from state.authorization
      if (this.client.state.authorization) {
        return this.client.state.authorization;
      }
      
      // Fallback: try to get from cookies
      const sessionId = this.client.state.getCookieValueSafe('sessionid');
      if (sessionId) {
        return sessionId;
      }
      
      return null;
    } catch (error) {
      if (this.client.state.verbose) {
        console.error('[Realtime] Error getting auth token:', error.message);
      }
      return null;
    }
  }

  /**
   * Handler for MQTT connection
   * @private
   */
  _onConnect() {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    if (this.client.state.verbose) {
      console.log('[Realtime] Connected to MQTT broker');
    }

    // Subscribe to all topics
    this._subscribeToTopics();
    
    // Emit connection event
    this.emit('connected');
  }

  /**
   * Handler for MQTT messages
   * @private
   */
  _onMessage(topic, payload) {
    try {
      const message = payload.toString();
      
      if (this.client.state.verbose) {
        console.log(`[Realtime] Received message on ${topic}: ${message}`);
      }

      // Find the topic configuration
      const topicConfig = this._findTopicByPath(topic);
      
      if (topicConfig && topicConfig.parser && !topicConfig.noParse) {
        // Parse using the topic's parser
        const parsedData = topicConfig.parser.parse(payload);
        
        // Emit generic realtime event
        this.emit('realtimeEvent', {
          topic,
          topicId: topicConfig.id,
          data: parsedData,
          rawPayload: message,
          timestamp: new Date().toISOString()
        });

        // Emit specific events based on topic
        this._emitTopicSpecificEvent(topic, parsedData);
      } else {
        // No parser or noParse is true, emit raw data
        this.emit('realtimeEvent', {
          topic,
          topicId: topicConfig ? topicConfig.id : null,
          data: { raw: message },
          rawPayload: message,
          timestamp: new Date().toISOString()
        });

        // Emit specific events based on topic
        this._emitTopicSpecificEvent(topic, { raw: message });
      }

    } catch (error) {
      if (this.client.state.verbose) {
        console.error('[Realtime] Error processing message:', error.message);
      }
      this.emit('error', error);
    }
  }

  /**
   * Find topic configuration by path
   * @private
   */
  _findTopicByPath(path) {
    return RealtimeTopicsArray.find(topic => topic.path === path);
  }

  /**
   * Emit topic-specific events
   * @private
   */
  _emitTopicSpecificEvent(topic, data) {
    switch (topic) {
      case '/graphql':
        this.emit('graphqlMessage', data);
        break;
      case '/pubsub':
        this.emit('pubsubMessage', data);
        break;
      case '/ig_send_message_response':
        this.emit('sendMessageResponse', data);
        break;
      case '/ig_sub_iris_response':
        this.emit('irisSubResponse', data);
        break;
      case '/ig_message_sync':
        this.emit('messageSync', data);
        break;
      case '/ig_realtime_sub':
        this.emit('realtimeSub', data);
        break;
      case '/t_region_hint':
        this.emit('regionHint', data);
        break;
      case '/t_fs':
        this.emit('foregroundState', data);
        break;
      case '/ig_send_message':
        this.emit('sendMessage', data);
        break;
      default:
        this.emit('unknownMessage', { topic, data });
    }
  }

  /**
   * Handler for MQTT errors
   * @private
   */
  _onError(error) {
    if (this.client.state.verbose) {
      console.error('[Realtime] MQTT error:', error.message);
    }
    
    this.emit('error', error);
    
    // Try reconnection if not already in process
    if (!this.isConnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
      this._scheduleReconnect();
    }
  }

  /**
   * Handler for connection close
   * @private
   */
  _onClose() {
    this.isConnected = false;
    
    if (this.client.state.verbose) {
      console.log('[Realtime] MQTT connection closed');
    }
    
    this.emit('disconnected');
    
    // Try reconnection if not manually disconnected
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this._scheduleReconnect();
    }
  }

  /**
   * Handler for offline
   * @private
   */
  _onOffline() {
    this.isConnected = false;
    
    if (this.client.state.verbose) {
      console.log('[Realtime] MQTT client offline');
    }
    
    this.emit('offline');
  }

  /**
   * Handler for reconnection
   * @private
   */
  _onReconnect() {
    if (this.client.state.verbose) {
      console.log('[Realtime] MQTT client reconnecting...');
    }
    
    this.emit('reconnecting');
  }

  /**
   * Subscribe to all topics
   * @private
   */
  _subscribeToTopics() {
    if (!this.isRealtimeConnected()) {
      return;
    }

    RealtimeTopicsArray.forEach(topic => {
      this.mqttClient.subscribe(topic.path, (err) => {
        if (err) {
          if (this.client.state.verbose) {
            console.error(`[Realtime] Failed to subscribe to ${topic.path}:`, err.message);
          }
        } else {
          if (this.client.state.verbose) {
            console.log(`[Realtime] Subscribed to ${topic.path}`);
          }
        }
      });
    });
  }

  /**
   * Schedule reconnection
   * @private
   */
  _scheduleReconnect() {
    if (this.isConnecting) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    if (this.client.state.verbose) {
      console.log(`[Realtime] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    }
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(error => {
          if (this.client.state.verbose) {
            console.error('[Realtime] Reconnect failed:', error.message);
          }
        });
      } else {
        if (this.client.state.verbose) {
          console.error('[Realtime] Max reconnect attempts reached');
        }
        this.emit('maxReconnectAttemptsReached');
      }
    }, delay);
  }

  /**
   * Set reconnection options
   * @param {Object} options - Reconnection options
   * @param {number} options.maxAttempts - Maximum number of attempts
   * @param {number} options.delay - Initial delay in ms
   */
  setReconnectOptions(options = {}) {
    if (typeof options.maxAttempts === 'number') {
      this.maxReconnectAttempts = options.maxAttempts;
    }
    if (typeof options.delay === 'number') {
      this.reconnectDelay = options.delay;
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getStats() {
    return {
      isConnected: this.isRealtimeConnected(),
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      clientId: this.clientId,
      subscribedTopics: RealtimeTopicsArray.map(t => t.path),
      broker: `${this.protocol}://${this.broker}:${this.port}`
    };
  }
}

module.exports = RealtimeService;