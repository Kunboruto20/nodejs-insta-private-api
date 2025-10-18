const EventEmitter = require('events');
const StableMqttService = require('./stable-mqtt.service');

/**
 * Enhanced Instagram Realtime MQTT Service
 * 
 * Serviciu îmbunătățit care folosește StableMqttService pentru o conexiune
 * MQTT stabilă cu reconectare automată și ping-uri periodice.
 * 
 * @class EnhancedRealtimeService
 * @extends EventEmitter
 */
class EnhancedRealtimeService extends EventEmitter {
  constructor(client) {
    super();
    
    this.client = client;
    this.stableMqtt = new StableMqttService(client);
    
    // Configurează event forwarding
    this._setupEventForwarding();
  }

  /**
   * Configurează forwarding-ul de evenimente de la StableMqttService
   * @private
   */
  _setupEventForwarding() {
    // Forward toate evenimentele de la stableMqtt
    this.stableMqtt.on('connected', () => {
      this.emit('connected');
    });
    
    this.stableMqtt.on('disconnected', () => {
      this.emit('disconnected');
    });
    
    this.stableMqtt.on('reconnecting', (data) => {
      this.emit('reconnecting', data);
    });
    
    this.stableMqtt.on('offline', () => {
      this.emit('offline');
    });
    
    this.stableMqtt.on('error', (error) => {
      this.emit('error', error);
    });
    
    this.stableMqtt.on('ping', () => {
      this.emit('ping');
    });
    
    this.stableMqtt.on('fallbackModeEnabled', () => {
      this.emit('fallbackModeEnabled');
    });
    
    this.stableMqtt.on('fallbackModeDisabled', () => {
      this.emit('fallbackModeDisabled');
    });
    
    this.stableMqtt.on('fallbackPolling', () => {
      this.emit('fallbackPolling');
    });
    
    // Forward evenimentele de realtime
    this.stableMqtt.on('realtimeEvent', (event) => {
      this.emit('realtimeEvent', event);
    });
    
    this.stableMqtt.on('pushNotification', (payload) => {
      this.emit('pushNotification', payload);
    });
    
    this.stableMqtt.on('directMessage', (payload) => {
      this.emit('directMessage', payload);
    });
    
    this.stableMqtt.on('presenceUpdate', (payload) => {
      this.emit('presenceUpdate', payload);
    });
    
    this.stableMqtt.on('typingIndicator', (payload) => {
      this.emit('typingIndicator', payload);
    });
    
    this.stableMqtt.on('activityNotification', (payload) => {
      this.emit('activityNotification', payload);
    });
    
    this.stableMqtt.on('unknownMessage', (data) => {
      this.emit('unknownMessage', data);
    });
  }

  /**
   * Conectează serviciul realtime îmbunătățit
   * @returns {Promise<boolean>} True dacă conexiunea a reușit
   */
  async connect() {
    return await this.stableMqtt.connect();
  }

  /**
   * Deconectează serviciul realtime
   */
  disconnect() {
    this.stableMqtt.disconnect();
  }

  /**
   * Verifică dacă serviciul este conectat
   * @returns {boolean}
   */
  isRealtimeConnected() {
    return this.stableMqtt.isStableMqttConnected();
  }

  /**
   * Trimite ping la broker
   */
  ping() {
    this.stableMqtt.ping();
  }

  /**
   * Setează opțiunile de reconectare
   * @param {Object} options - Opțiunile de reconectare
   */
  setReconnectOptions(options) {
    this.stableMqtt.setReconnectOptions(options);
  }

  /**
   * Setează intervalul de ping
   * @param {number} intervalMs - Intervalul în milisecunde
   */
  setPingInterval(intervalMs) {
    this.stableMqtt.setPingInterval(intervalMs);
  }

  /**
   * Setează intervalul de fallback polling
   * @param {number} intervalMs - Intervalul în milisecunde
   */
  setFallbackPollingInterval(intervalMs) {
    this.stableMqtt.setFallbackPollingInterval(intervalMs);
  }

  /**
   * Obține statisticile serviciului
   * @returns {Object} Statisticile serviciului
   */
  getStats() {
    return this.stableMqtt.getStats();
  }
}

module.exports = EnhancedRealtimeService;