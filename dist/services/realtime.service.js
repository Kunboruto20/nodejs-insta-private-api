const EventEmitter = require('events');
const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');

/**
 * Instagram Realtime MQTT Service
 * 
 * Simulează comportamentul aplicației Instagram pentru evenimente în timp real
 * folosind MQTT cu broker-ul Facebook.
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
    this.reconnectDelay = 5000; // 5 secunde
    this.keepalive = 60;
    this.cleanSession = false;
    
    // Configurații MQTT
    this.broker = 'mqtt-mini.facebook.com';
    this.port = 443; // TLS
    this.protocol = 'mqtts';
    this.username = 'fbns';
    
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
  }

  /**
   * Conectează la broker-ul MQTT
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
        throw new Error('Client must be logged in to use realtime service');
      }

      // Obține token-ul de autorizare din session
      const authToken = this._getAuthToken();
      if (!authToken) {
        throw new Error('No valid authorization token found in session');
      }

      // Configurare conexiune MQTT
      const mqttOptions = {
        clientId: this.clientId,
        username: this.username,
        password: authToken,
        keepalive: this.keepalive,
        clean: this.cleanSession,
        reconnectPeriod: 0, // Dezactivează reconectarea automată - o gestionăm manual
        connectTimeout: 30000,
        protocolVersion: 4, // MQTT v3.1.1
        rejectUnauthorized: true
      };

      // URL-ul broker-ului
      const brokerUrl = `${this.protocol}://${this.broker}:${this.port}`;
      
      if (this.client.state.verbose) {
        console.log(`[Realtime] Connecting to MQTT broker: ${brokerUrl}`);
        console.log(`[Realtime] Client ID: ${this.clientId}`);
        console.log(`[Realtime] Username: ${this.username}`);
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
        console.error('[Realtime] Connection failed:', error.message);
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
        console.log('[Realtime] Disconnecting from MQTT broker...');
      }
      
      this.mqttClient.end();
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Verifică dacă serviciul este conectat
   * @returns {boolean}
   */
  isRealtimeConnected() {
    return this.isConnected && this.mqttClient && this.mqttClient.connected;
  }

  /**
   * Trimite un ping la broker
   */
  ping() {
    if (this.isRealtimeConnected()) {
      if (this.client.state.verbose) {
        console.log('[Realtime] Sending ping...');
      }
      // MQTT client-ul gestionează automat ping-urile prin keepalive
      // Dar putem emite un event pentru debugging
      this.emit('ping');
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
        console.error('[Realtime] Error getting auth token:', error.message);
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
    
    if (this.client.state.verbose) {
      console.log('[Realtime] Connected to MQTT broker');
    }

    // Abonează-te la toate topicurile
    this._subscribeToTopics();
    
    // Emite event de conexiune
    this.emit('connected');
  }

  /**
   * Handler pentru mesajele MQTT
   * @private
   */
  _onMessage(topic, payload) {
    try {
      const message = payload.toString();
      
      if (this.client.state.verbose) {
        console.log(`[Realtime] Received message on ${topic}: ${message}`);
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
        console.error('[Realtime] Error processing message:', error.message);
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
      console.error('[Realtime] MQTT error:', error.message);
    }
    
    this.emit('error', error);
    
    // Încearcă reconectarea dacă nu suntem deja în proces
    if (!this.isConnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
      this._scheduleReconnect();
    }
  }

  /**
   * Handler pentru închiderea conexiunii
   * @private
   */
  _onClose() {
    this.isConnected = false;
    
    if (this.client.state.verbose) {
      console.log('[Realtime] MQTT connection closed');
    }
    
    this.emit('disconnected');
    
    // Încearcă reconectarea dacă nu am fost deconectați manual
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this._scheduleReconnect();
    }
  }

  /**
   * Handler pentru offline
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
   * Handler pentru reconectare
   * @private
   */
  _onReconnect() {
    if (this.client.state.verbose) {
      console.log('[Realtime] MQTT client reconnecting...');
    }
    
    this.emit('reconnecting');
  }

  /**
   * Abonează-te la toate topicurile
   * @private
   */
  _subscribeToTopics() {
    if (!this.isRealtimeConnected()) {
      return;
    }

    this.topics.forEach(topic => {
      this.mqttClient.subscribe(topic, (err) => {
        if (err) {
          if (this.client.state.verbose) {
            console.error(`[Realtime] Failed to subscribe to ${topic}:`, err.message);
          }
        } else {
          if (this.client.state.verbose) {
            console.log(`[Realtime] Subscribed to ${topic}`);
          }
        }
      });
    });
  }

  /**
   * Programează reconectarea
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
   * Obține statisticile conexiunii
   * @returns {Object} Statisticile conexiunii
   */
  getStats() {
    return {
      isConnected: this.isRealtimeConnected(),
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      clientId: this.clientId,
      subscribedTopics: this.topics,
      broker: `${this.protocol}://${this.broker}:${this.port}`
    };
  }
}

module.exports = RealtimeService;