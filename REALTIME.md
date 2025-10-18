# Instagram Realtime MQTT Service

Acest modul extinde biblioteca `nodejs-insta-private-api` cu funcționalitate realtime MQTT, simulând comportamentul aplicației Instagram pentru recepția de evenimente în timp real.

## 🚀 Caracteristici

- **MQTT v3.1.1** cu broker-ul Facebook (`mqtt-mini.facebook.com`)
- **TLS securizat** pe portul 443
- **Reconectare automată** cu exponential backoff
- **Event-uri specifice** pentru fiecare tip de mesaj
- **Integrare completă** cu biblioteca existentă
- **Zero modificări** la codul existent

## 📡 Topicuri MQTT

| Topic | Descriere | Event Emis |
|-------|-----------|------------|
| `/fbns_msg` | Notificări push | `pushNotification` |
| `/ig_message` | Mesaje directe | `directMessage` |
| `/ig_presence` | Status online | `presenceUpdate` |
| `/ig_typing` | Indicator de typing | `typingIndicator` |
| `/ig_activity` | Notificări de activitate | `activityNotification` |

## 🔧 Instalare

Modulul este inclus automat în bibliotecă. Singura dependință necesară este `mqtt`:

```bash
npm install mqtt
```

## 📖 Utilizare

### 1. Conectare de bază

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');

const ig = new IgApiClient();

// Login (necesar pentru realtime)
await ig.login({
  username: 'your_username',
  password: 'your_password'
});

// Conectare la MQTT
await ig.connectRealtime();
```

### 2. Ascultarea evenimentelor

```javascript
// Event generic pentru toate mesajele
ig.realtime.on('realtimeEvent', (event) => {
  console.log(`Topic: ${event.topic}`);
  console.log(`Payload: ${JSON.stringify(event.payload)}`);
  console.log(`Timestamp: ${event.timestamp}`);
});

// Event-uri specifice
ig.realtime.on('directMessage', (payload) => {
  console.log('New DM:', payload);
});

ig.realtime.on('pushNotification', (payload) => {
  console.log('Push notification:', payload);
});

ig.realtime.on('presenceUpdate', (payload) => {
  console.log('User presence:', payload);
});
```

### 3. Gestionarea conexiunii

```javascript
// Verifică dacă este conectat
if (ig.isRealtimeConnected()) {
  console.log('Realtime connected!');
}

// Ping la broker
ig.pingRealtime();

// Obține statistici
const stats = ig.getRealtimeStats();
console.log(stats);

// Deconectare
ig.disconnectRealtime();
```

### 4. Configurare reconectare

```javascript
// Setează opțiunile de reconectare
ig.setRealtimeReconnectOptions({
  maxAttempts: 5,    // Max 5 încercări
  delay: 3000        // 3 secunde delay inițial
});
```

## 🎯 Event-uri disponibile

### Event-uri de conexiune
- `connected` - Conectat la MQTT
- `disconnected` - Deconectat de la MQTT
- `reconnecting` - În proces de reconectare
- `offline` - Client offline
- `error` - Eroare MQTT
- `maxReconnectAttemptsReached` - Max încercări de reconectare atinse

### Event-uri de mesaje
- `realtimeEvent` - Event generic pentru toate mesajele
- `pushNotification` - Notificări push
- `directMessage` - Mesaje directe
- `presenceUpdate` - Actualizări de prezență
- `typingIndicator` - Indicator de typing
- `activityNotification` - Notificări de activitate
- `unknownMessage` - Mesaje pe topicuri necunoscute

### Event-uri de debugging
- `ping` - Ping trimis la broker

## 🔧 Configurare avansată

### Broker MQTT
```javascript
// Configurațiile sunt hardcodate pentru compatibilitate cu Instagram:
// - Broker: mqtt-mini.facebook.com
// - Port: 443 (TLS)
// - Protocol: MQTT v3.1.1
// - Username: fbns
// - Password: token din session
```

### Client ID
```javascript
// Client ID-ul este generat automat ca: android-{uuid}
// Exemplu: android-a1b2c3d4e5f6g7h8
```

### Keepalive
```javascript
// Keepalive: 60 secunde (configurabil în cod)
// Clean session: false (pentru persistență)
```

## 🛡️ Securitate

- **TLS obligatoriu** - toate conexiunile sunt criptate
- **Token de autorizare** - folosește token-ul din session-ul Instagram
- **Client ID unic** - fiecare conexiune are un ID unic
- **Reconectare securizată** - păstrează autentificarea la reconectare

## 🐛 Debugging

Activează modul verbose pentru a vedea log-urile MQTT:

```javascript
ig.setVerbose(true);
```

Aceasta va afișa:
- Mesaje de conexiune/deconectare
- Mesaje primite pe fiecare topic
- Erori de reconectare
- Ping-uri trimise

## 📝 Exemplu complet

Vezi `realtime-example.js` pentru un exemplu complet de utilizare.

## ⚠️ Note importante

1. **Autentificare necesară** - Trebuie să fii logat înainte de a folosi realtime
2. **Token valid** - Session-ul trebuie să conțină un token de autorizare valid
3. **Rate limiting** - Respectă limitele Instagram pentru a evita blocarea
4. **ToS compliance** - Folosește responsabil și respectă termenii de serviciu

## 🔄 Changelog

### v1.0.0
- Implementare inițială a serviciului MQTT
- Suport pentru toate topicurile Instagram
- Reconectare automată cu exponential backoff
- Integrare completă cu biblioteca existentă
- Event system extensibil
- Documentație completă

## 🤝 Contribuții

Modulul este extensibil și poate fi îmbunătățit cu:
- Suport pentru topicuri noi
- Parsing avansat de payload-uri
- Metrici de performanță
- Health checks
- Load balancing

## 📄 Licență

MIT - același ca biblioteca principală.