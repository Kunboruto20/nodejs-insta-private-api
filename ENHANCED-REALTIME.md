# Instagram Enhanced Realtime MQTT Service

Serviciul Enhanced Realtime MQTT oferă o conexiune stabilă și robustă pentru evenimente în timp real de la Instagram, rezolvând problemele comune de deconectare și instabilitate.

## 🚀 Caracteristici

### ✅ Stabilitate îmbunătățită
- **Reconectare automată** cu exponential backoff
- **Ping-uri periodice** pentru a menține conexiunea vie
- **Gestionare robustă a erorilor** pentru toate tipurile de deconectări
- **Fallback polling mode** dacă MQTT eșuează complet

### 🔧 Configurații optimizate
- **MQTT v3.1.1** over TLS pe port 443
- **Keepalive de 60 secunde** cu reconectare la 5 secunde
- **Compresie/decompresie** automată pentru payload-uri
- **QoS Level 1** pentru mesaje importante

### 📡 Topicuri suportate
- `/fbns_msg` - Notificări push
- `/ig_message` - Mesaje directe
- `/ig_presence` - Status online
- `/ig_typing` - Indicator de typing
- `/ig_activity` - Notificări de activitate

## 📖 Utilizare

### Instalare și import

```javascript
const { IgApiClient } = require('nodejs-insta-private-api');

const ig = new IgApiClient();
```

### Conectare de bază

```javascript
// Autentificare
await ig.login({
  username: 'your_username',
  password: 'your_password'
});

// Conectare la serviciul realtime îmbunătățit
await ig.connectEnhancedRealtime();
```

### Configurare avansată

```javascript
// Configurează opțiunile de reconectare
ig.setEnhancedRealtimeReconnectOptions({
  maxAttempts: 10,    // Maxim 10 încercări de reconectare
  delay: 5000         // Delay inițial de 5 secunde
});

// Setează intervalul de ping (30 secunde)
ig.setEnhancedRealtimePingInterval(30000);

// Setează intervalul de fallback polling (10 secunde)
ig.setEnhancedRealtimeFallbackPollingInterval(10000);
```

### Ascultarea evenimentelor

```javascript
// Event generic pentru toate evenimentele
ig.enhancedRealtime.on('realtimeEvent', (event) => {
  console.log(`Topic: ${event.topic}`);
  console.log(`Payload: ${JSON.stringify(event.payload)}`);
});

// Event-uri specifice
ig.enhancedRealtime.on('pushNotification', (payload) => {
  console.log('Push notification:', payload);
});

ig.enhancedRealtime.on('directMessage', (payload) => {
  console.log('Direct message:', payload);
});

ig.enhancedRealtime.on('presenceUpdate', (payload) => {
  console.log('Presence update:', payload);
});

ig.enhancedRealtime.on('typingIndicator', (payload) => {
  console.log('Typing indicator:', payload);
});
```

### Event-uri de conexiune

```javascript
ig.enhancedRealtime.on('connected', () => {
  console.log('✅ Connected to enhanced MQTT');
});

ig.enhancedRealtime.on('disconnected', () => {
  console.log('❌ Disconnected from enhanced MQTT');
});

ig.enhancedRealtime.on('reconnecting', (data) => {
  console.log(`🔄 Reconnecting... (attempt ${data.attempt}/${data.maxAttempts})`);
});

ig.enhancedRealtime.on('fallbackModeEnabled', () => {
  console.log('🔄 Fallback mode enabled - switching to polling');
});

ig.enhancedRealtime.on('fallbackModeDisabled', () => {
  console.log('✅ Fallback mode disabled - back to MQTT');
});
```

### Verificarea statusului

```javascript
// Verifică dacă este conectat
if (ig.isEnhancedRealtimeConnected()) {
  console.log('Connected to enhanced realtime');
}

// Obține statistici
const stats = ig.getEnhancedRealtimeStats();
console.log('Stats:', stats);
```

### Deconectare

```javascript
// Deconectare manuală
ig.disconnectEnhancedRealtime();

// Cleanup complet
ig.destroy();
```

## 🔧 API Reference

### Metode principale

#### `connectEnhancedRealtime()`
Conectează la serviciul realtime îmbunătățit.

**Returns:** `Promise<boolean>` - True dacă conexiunea a reușit

#### `disconnectEnhancedRealtime()`
Deconectează de la serviciul realtime îmbunătățit.

#### `isEnhancedRealtimeConnected()`
Verifică dacă serviciul este conectat.

**Returns:** `boolean`

#### `pingEnhancedRealtime()`
Trimite ping manual la broker.

#### `getEnhancedRealtimeStats()`
Obține statisticile serviciului.

**Returns:** `Object`

### Metode de configurare

#### `setEnhancedRealtimeReconnectOptions(options)`
Setează opțiunile de reconectare.

**Parameters:**
- `options.maxAttempts` (number) - Numărul maxim de încercări
- `options.delay` (number) - Delay-ul inițial în ms

#### `setEnhancedRealtimePingInterval(intervalMs)`
Setează intervalul de ping.

**Parameters:**
- `intervalMs` (number) - Intervalul în milisecunde

#### `setEnhancedRealtimeFallbackPollingInterval(intervalMs)`
Setează intervalul de fallback polling.

**Parameters:**
- `intervalMs` (number) - Intervalul în milisecunde

### Event-uri

#### `realtimeEvent`
Event generic pentru toate evenimentele realtime.

**Payload:** `{ topic, payload, rawPayload, timestamp }`

#### `pushNotification`
Notificări push de la Instagram.

#### `directMessage`
Mesaje directe.

#### `presenceUpdate`
Actualizări de prezență.

#### `typingIndicator`
Indicatori de typing.

#### `activityNotification`
Notificări de activitate.

#### `connected`
Conectat la MQTT broker.

#### `disconnected`
Deconectat de la MQTT broker.

#### `reconnecting`
În proces de reconectare.

**Payload:** `{ attempt, maxAttempts }`

#### `fallbackModeEnabled`
Modul fallback activat.

#### `fallbackModeDisabled`
Modul fallback dezactivat.

#### `ping`
Ping trimis la broker.

#### `error`
Eroare în serviciu.

## 🛡️ Rezolvarea problemelor

### Probleme comune

#### ECONNRESET și deconectări frecvente
Serviciul îmbunătățit rezolvă aceste probleme prin:
- Reconectare automată cu exponential backoff
- Ping-uri periodice pentru a menține conexiunea
- Gestionare robustă a erorilor
- Fallback polling dacă MQTT eșuează

#### Timeout-uri de conexiune
- Verifică că ai o conexiune stabilă la internet
- Asigură-te că token-ul de autorizare este valid
- Verifică că nu ai firewall-uri care blochează conexiunea MQTT

#### Lipsa evenimentelor
- Verifică că ești abonat la topicurile corecte
- Asigură-te că serviciul este conectat
- Verifică logs-urile pentru erori

### Debugging

Activează modul verbose pentru mai multe informații:

```javascript
ig.setVerbose(true);
```

## 📊 Comparație cu serviciul standard

| Caracteristică | Serviciul Standard | Serviciul Îmbunătățit |
|---|---|---|
| Reconectare automată | Manual cu exponential backoff | Automată cu exponential backoff |
| Ping-uri periodice | Doar keepalive MQTT | Ping-uri periodice + keepalive |
| Gestionarea erorilor | De bază | Robustă pentru toate tipurile |
| Fallback mode | Nu | Da, cu polling |
| Compresie payload | Nu | Da, automată |
| Configurabilitate | Limită | Extinsă |
| Stabilitate | Medie | Înaltă |

## 🔒 Securitate

- Folosește TLS pentru toate conexiunile
- Token-urile de autorizare sunt gestionate securizat
- Nu stochează credențiale în memorie
- Cleanup automat la deconectare

## 📝 Exemple complete

Vezi `enhanced-realtime-example.js` pentru un exemplu complet de utilizare.

## 🧪 Testare

Rulează testele pentru a verifica funcționalitatea:

```bash
node test-enhanced-realtime.js
```

## ⚠️ Note importante

1. **Autentificare necesară**: Trebuie să fii autentificat înainte de a folosi serviciul
2. **Rate limiting**: Respectă limitele Instagram pentru a evita blocarea
3. **ToS compliance**: Folosește responsabil și respectă Termenii de Serviciu Instagram
4. **Fallback mode**: Dacă MQTT eșuează complet, serviciul va trece automat la polling
5. **Cleanup**: Întotdeauna apelează `destroy()` când termini

## 🆘 Suport

Pentru probleme sau întrebări:
1. Verifică logs-urile cu `setVerbose(true)`
2. Testează cu `test-enhanced-realtime.js`
3. Verifică că toate dependențele sunt instalate corect
4. Asigură-te că ai o conexiune stabilă la internet