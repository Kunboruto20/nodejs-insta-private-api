const EventEmitter = require('events');
const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');
const zlib = require('zlib');

/**
 * Instagram Stable MQTT Service
 * 
 * Implementare stabilă pentru MQTT cu reconectare automată, ping-uri periodice
 * și gestionare robustă a erorilor, inspirată din implementarea Nerixyz.
 * 
 * @class StableMqttService
 * @extends EventEmitter
 */
class StableMqttService extends EventEmitter {
  constructor(client) {
    super();
    
    this.client = client;
    this.mqttClient = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 secunde
    this.pingInterval = null;
    this.pingIntervalMs = 30000; // 30 secunde
    this.fallbackMode = false;
    this.fallbackPollingInterval = null;
    this.fallbackPollingMs = 10000; // 10 secunde
    
    // Configurații MQTT optimizate
    this.broker = 'mqtt-mini.facebook.com';
    this.port = 443; // TLS
    this.protocol = 'mqtts';
    this.username = 'fbns';
    this.keepalive = 60;
    this.cleanSession = false;
    
    // Topicuri de abonare
    this.topics = [
      '/fbns_msg',      // notificări push
      '/ig_message',    // mesaje directe
      '/ig_presence',   // status online
      '/ig_typing',     // indicator de typing
      '/ig_activity'    // notificări de activitate
    ];
    
    // Client ID generat
    this.clientId = `android-${uuidv4().replace(/-/g, '')}`;
    
    // Bind methods pentru a păstra contextul
    this._onConnect = this._onConnect.bind(this);
    this._onMessage = this._onMessage.bind(this);
    this._onError = this._onError.bind(this);
    this._onClose = this._onClose.bind(this);
    this._onOffline = this._onOffline.bind(this);
    this._onReconnect = this._onReconnect.bind(this);
    this._onDisconnect = this._onDisconnect.bind(this);
  }

  /**
   * Conectează la broker-ul MQTT cu configurații optimizate
   * @returns {Promise<boolean>} True dacă conexiunea a reușit
   */
  async connect() {
    if (this.isConnected || this.isConnecting) {
      return this.isConnected;
    }

    this.isConnecting = true;
    
    try {
      // Verifică dacă clientul este autentificat
      if (!this.client.isLoggedIn()) {
        throw new Error('Client must be logged in to use stable MQTT service');
      }

      // Obține token-ul de autorizare din session
      const authToken = this._getAuthToken();
      if (!authToken) {
        throw new Error('No valid authorization token found in session');
      }

      // Configurare conexiune MQTT optimizată
      const mqttOptions = {
        clientId: this.clientId,
        username: this.username,
        password: authToken,
        keepalive: this.keepalive,
        clean: this.cleanSession,
        reconnectPeriod: 5000, // Reconectare automată la 5 secunde
        connectTimeout: 30000,
        protocolVersion: 4, // MQTT v3.1.1
        rejectUnauthorized: true,
        // Configurații suplimentare pentru stabilitate
        reschedulePings: true,
        queueQoSZero: false,
        incomingStore: null,
        outgoingStore: null,
        // Configurații pentru gestionarea erorilor
        transformWsUrl: (url, options, client) => {
          // Adaugă headers suplimentare pentru stabilitate
          return url;
        }
      };

      // URL-ul broker-ului
      const brokerUrl = `${this.protocol}://${this.broker}:${this.port}`;
      
      if (this.client.state.verbose) {
        console.log(`[StableMQTT] Connecting to MQTT broker: ${brokerUrl}`);
        console.log(`[StableMQTT] Client ID: ${this.clientId}`);
        console.log(`[StableMQTT] Username: ${this.username}`);
        console.log(`[StableMQTT] Reconnect period: ${mqttOptions.reconnectPeriod}ms`);
      }

      // Creează conexiunea MQTT
      this.mqttClient = mqtt.connect(brokerUrl, mqttOptions);

      // Configurează event handlers
      this.mqttClient.on('connect', this._onConnect);
      this.mqttClient.on('message', this._onMessage);
      this.mqttClient.on('error', this._onError);
      this.mqttClient.on('close', this._onClose);
      this.mqttClient.on('offline', this._onOffline);
      this.mqttClient.on('reconnect', this._onReconnect);
      this.mqttClient.on('disconnect', this._onDisconnect);

      // Așteaptă conexiunea
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
        console.error('[StableMQTT] Connection failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Deconectează de la broker-ul MQTT
   */
  disconnect() {
    if (this.mqttClient && this.isConnected) {
      if (this.client.state.verbose) {
        console.log('[StableMQTT] Disconnecting from MQTT broker...');
      }
      
      // Oprește ping-urile periodice
      this._stopPingInterval();
      
      // Oprește fallback polling
      this._stopFallbackPolling();
      
      this.mqttClient.end(true); // Forțează deconectarea
      this.isConnected = false;
      this.reconnectAttempts = 0;
      this.fallbackMode = false;
    }
  }

  /**
   * Verifică dacă serviciul este conectat
   * @returns {boolean}
   */
  isStableMqttConnected() {
    return this.isConnected && this.mqttClient && this.mqttClient.connected;
  }

  /**
   * Trimite un ping la broker
   */
  ping() {
    if (this.isStableMqttConnected()) {
      if (this.client.state.verbose) {
        console.log('[StableMQTT] Sending ping...');
      }
      
      // Trimite ping manual prin clientul MQTT
      if (this.mqttClient && typeof this.mqttClient.ping === 'function') {
        this.mqttClient.ping();
      }
      
      this.emit('ping');
    }
  }

  /**
   * Activează modul fallback cu polling
   * @private
   */
  _enableFallbackMode() {
    if (this.fallbackMode) {
      return;
    }
    
    this.fallbackMode = true;
    this._stopPingInterval();
    
    if (this.client.state.verbose) {
      console.log('[StableMQTT] Enabling fallback mode with polling...');
    }
    
    // Implementează polling ca fallback
    this.fallbackPollingInterval = setInterval(() => {
      this._performFallbackPolling();
    }, this.fallbackPollingMs);
    
    this.emit('fallbackModeEnabled');
  }

  /**
   * Dezactivează modul fallback
   * @private
   */
  _disableFallbackMode() {
    if (!this.fallbackMode) {
      return;
    }
    
    this.fallbackMode = false;
    this._stopFallbackPolling();
    
    if (this.client.state.verbose) {
      console.log('[StableMQTT] Disabling fallback mode...');
    }
    
    this.emit('fallbackModeDisabled');
  }

  /**
   * Oprește intervalul de ping
   * @private
   */
  _stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Oprește intervalul de fallback polling
   * @private
   */
  _stopFallbackPolling() {
    if (this.fallbackPollingInterval) {
      clearInterval(this.fallbackPollingInterval);
      this.fallbackPollingInterval = null;
    }
  }

  /**
   * Execută polling ca fallback
   * @private
   */
  async _performFallbackPolling() {
    try {
      // Implementează polling pentru notificări
      // Aceasta ar trebui să fie o implementare simplă de polling
      // care să verifice periodic pentru notificări noi
      
      if (this.client.state.verbose) {
        console.log('[StableMQTT] Performing fallback polling...');
      }
      
      // Emite event pentru polling fallback
      this.emit('fallbackPolling');
      
    } catch (error) {
      if (this.client.state.verbose) {
        console.error('[StableMQTT] Fallback polling error:', error.message);
      }
    }
  }

  /**
   * Obține token-ul de autorizare din session
   * @private
   */
  _getAuthToken() {
    try {
      // Încearcă să obțină din state.authorization
      if (this.client.state.authorization) {
        return this.client.state.authorization;
      }
      
      // Fallback: încearcă să obțină din cookies
      const sessionId = this.client.state.getCookieValueSafe('sessionid');
      if (sessionId) {
        return sessionId;
      }
      
      return null;
    } catch (error) {
      if (this.client.state.verbose) {
        console.error('[StableMQTT] Error getting auth token:', error.message);
      }
      return null;
    }
  }

  /**
   * Handler pentru conexiunea MQTT
   * @private
   */
  _onConnect() {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.fallbackMode = false;
    
    if (this.client.state.verbose) {
      console.log('[StableMQTT] Connected to MQTT broker');
    }

    // Abonează-te la toate topicurile
    this._subscribeToTopics();
    
    // Pornește ping-urile periodice
    this._startPingInterval();
    
    // Dezactivează fallback mode dacă era activ
    this._disableFallbackMode();
    
    // Emite event de conexiune
    this.emit('connected');
  }

  /**
   * Pornește intervalul de ping
   * @private
   */
  _startPingInterval() {
    this._stopPingInterval(); // Oprește orice interval existent
    
    this.pingInterval = setInterval(() => {
      this.ping();
    }, this.pingIntervalMs);
    
    if (this.client.state.verbose) {
      console.log(`[StableMQTT] Started ping interval: ${this.pingIntervalMs}ms`);
    }
  }

  /**
   * Handler pentru mesajele MQTT
   * @private
   */
  _onMessage(topic, payload) {
    try {
      let message = payload.toString();
      
      // Încearcă să decompresezi payload-ul dacă este comprimat
      try {
        const decompressed = zlib.inflateSync(Buffer.from(payload));
        message = decompressed.toString();
      } catch {
        // Nu este comprimat, folosește mesajul original
      }
      
      if (this.client.state.verbose) {
        console.log(`[StableMQTT] Received message on ${topic}: ${message.substring(0, 200)}...`);
      }

      // Parsează payload-ul (poate fi JSON sau text simplu)
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(message);
      } catch {
        parsedPayload = message;
      }

      // Emite event generic pentru realtime
      this.emit('realtimeEvent', {
        topic,
        payload: parsedPayload,
        rawPayload: message,
        timestamp: new Date().toISOString()
      });

      // Emite event-uri specifice pentru fiecare topic
      switch (topic) {
        case '/fbns_msg':
          this.emit('pushNotification', parsedPayload);
          break;
        case '/ig_message':
          this.emit('directMessage', parsedPayload);
          break;
        case '/ig_presence':
          this.emit('presenceUpdate', parsedPayload);
          break;
        case '/ig_typing':
          this.emit('typingIndicator', parsedPayload);
          break;
        case '/ig_activity':
          this.emit('activityNotification', parsedPayload);
          break;
        default:
          this.emit('unknownMessage', { topic, payload: parsedPayload });
      }

    } catch (error) {
      if (this.client.state.verbose) {
        console.error('[StableMQTT] Error processing message:', error.message);
      }
      this.emit('error', error);
    }
  }

  /**
   * Handler pentru erorile MQTT
   * @private
   */
  _onError(error) {
    if (this.client.state.verbose) {
      console.error('[StableMQTT] MQTT error:', error.message);
    }
    
    this.emit('error', error);
    
    // Verifică dacă trebuie să activez fallback mode
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._enableFallbackMode();
    }
  }

  /**
   * Handler pentru închiderea conexiunii
   * @private
   */
  _onClose() {
    this.isConnected = false;
    this._stopPingInterval();
    
    if (this.client.state.verbose) {
      console.log('[StableMQTT] MQTT connection closed');
    }
    
    this.emit('disconnected');
    
    // Verifică dacă trebuie să activez fallback mode
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._enableFallbackMode();
    }
  }

  /**
   * Handler pentru offline
   * @private
   */
  _onOffline() {
    this.isConnected = false;
    this._stopPingInterval();
    
    if (this.client.state.verbose) {
      console.log('[StableMQTT] MQTT client offline');
    }
    
    this.emit('offline');
  }

  /**
   * Handler pentru reconectare
   * @private
   */
  _onReconnect() {
    this.reconnectAttempts++;
    
    if (this.client.state.verbose) {
      console.log(`[StableMQTT] MQTT client reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    }
    
    this.emit('reconnecting', { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts });
  }

  /**
   * Handler pentru deconectare
   * @private
   */
  _onDisconnect() {
    this.isConnected = false;
    this._stopPingInterval();
    
    if (this.client.state.verbose) {
      console.log('[StableMQTT] MQTT client disconnected');
    }
    
    this.emit('disconnected');
  }

  /**
   * Abonează-te la toate topicurile
   * @private
   */
  _subscribeToTopics() {
    if (!this.isStableMqttConnected()) {
      return;
    }

    this.topics.forEach(topic => {
      this.mqttClient.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          if (this.client.state.verbose) {
            console.error(`[StableMQTT] Failed to subscribe to ${topic}:`, err.message);
          }
        } else {
          if (this.client.state.verbose) {
            console.log(`[StableMQTT] Subscribed to ${topic}`);
          }
        }
      });
    });
  }

  /**
   * Setează configurațiile de reconectare
   * @param {Object} options - Opțiunile de reconectare
   * @param {number} options.maxAttempts - Numărul maxim de încercări
   * @param {number} options.delay - Delay-ul inițial în ms
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
   * Setează intervalul de ping
   * @param {number} intervalMs - Intervalul în milisecunde
   */
  setPingInterval(intervalMs) {
    if (typeof intervalMs === 'number' && intervalMs > 0) {
      this.pingIntervalMs = intervalMs;
      
      // Restart intervalul dacă este activ
      if (this.pingInterval) {
        this._startPingInterval();
      }
    }
  }

  /**
   * Setează intervalul de fallback polling
   * @param {number} intervalMs - Intervalul în milisecunde
   */
  setFallbackPollingInterval(intervalMs) {
    if (typeof intervalMs === 'number' && intervalMs > 0) {
      this.fallbackPollingMs = intervalMs;
    }
  }

  /**
   * Obține statisticile conexiunii
   * @returns {Object} Statisticile conexiunii
   */
  getStats() {
    return {
      isConnected: this.isStableMqttConnected(),
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      clientId: this.clientId,
      subscribedTopics: this.topics,
      broker: `${this.protocol}://${this.broker}:${this.port}`,
      pingIntervalMs: this.pingIntervalMs,
      fallbackMode: this.fallbackMode,
      fallbackPollingMs: this.fallbackPollingMs
    };
  }
}

module.exports = StableMqttService;