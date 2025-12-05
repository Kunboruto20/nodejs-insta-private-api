# MQTT Full Integration - Modul de Utilizare

## Setup Inițial

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

const ig = new IgApiClient();
await ig.login({ username, password, email });

const realtime = new RealtimeClient(ig);
const inbox = await ig.direct.getInbox();
await realtime.connect({ 
  graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
  skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
  irisData: inbox 
});

// Acum poți folosi ALL 18 MQTT methods via realtime.directCommands
```

---

## 1. SEND TEXT MESSAGE - Trimitere Mesaj Text

```javascript
await realtime.directCommands.sendTextViaRealtime(threadId, 'Salut, cum esti?');
```

**Parametri:**
- `threadId` (string) - ID-ul grupului/conversației
- `text` (string) - Mesajul de trimis

---

## 2. DELETE MESSAGE - Ștergere Mesaj

```javascript
await realtime.directCommands.deleteMessage(threadId, messageId);
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `messageId` (string) - ID-ul mesajului de șters

---

## 3. EDIT MESSAGE - Editare Mesaj

```javascript
await realtime.directCommands.editMessage(threadId, messageId, 'Noul text editat');
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `messageId` (string) - ID-ul mesajului
- `newText` (string) - Noul text

---

## 4. REPLY TO MESSAGE - Răspuns la Mesaj (Quote Reply)

```javascript
await realtime.directCommands.replyToMessage(threadId, messageId, 'Raspunsul meu');
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `messageId` (string) - ID-ul mesajului la care răspunzi
- `replyText` (string) - Textul răspunsului

---

## 5. SEND REACTION (EMOJI) - Reacții cu Emoji

```javascript
// Like reaction
await realtime.directCommands.sendReaction({
  threadId: threadId,
  itemId: messageId,
  emoji: '❤️',
  reactionType: 'like',
  reactionStatus: 'created'
});

// Remove reaction
await realtime.directCommands.sendReaction({
  threadId: threadId,
  itemId: messageId,
  emoji: '❤️',
  reactionType: 'like',
  reactionStatus: 'deleted'
});
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `itemId` (string) - ID-ul mesajului
- `emoji` (string) - Emoji (ex: '❤️', '😂', '🔥')
- `reactionType` (string) - 'like' sau alt tip
- `reactionStatus` (string) - 'created' sau 'deleted'

---

## 6. SEND MEDIA (IMAGINE/VIDEO) - Trimitere Media

```javascript
await realtime.directCommands.sendMedia({
  threadId: threadId,
  mediaId: '12345678',
  text: 'Vezi poza asta!' // Optional
});
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `mediaId` (string) - ID-ul imaginii/video-ului din Instagram
- `text` (string) - Opțional: text alături de media

---

## 7. SEND LOCATION - Trimitere Locație

```javascript
await realtime.directCommands.sendLocation({
  threadId: threadId,
  locationId: '213999449',
  text: 'Îți trimit locația'
});
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `locationId` (string) - ID-ul locației din Instagram
- `text` (string) - Opțional: descriere

---

## 8. SEND PROFILE - Trimitere Profil User

```javascript
await realtime.directCommands.sendProfile({
  threadId: threadId,
  userId: '987654321',
  text: 'Uite profilul lui'
});
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `userId` (string) - ID-ul user-ului
- `text` (string) - Opțional: mesaj

---

## 9. SEND HASHTAG - Trimitere Hashtag

```javascript
await realtime.directCommands.sendHashtag({
  threadId: threadId,
  hashtag: 'instagram',
  text: 'Cauta acest hashtag'
});
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `hashtag` (string) - Hashtag fără #
- `text` (string) - Opțional: text

---

## 10. SEND LIKE - Trimitere Like

```javascript
await realtime.directCommands.sendLike({ threadId: threadId });
```

**Parametri:**
- `threadId` (string) - ID-ul grupului

---

## 11. SEND USER STORY - Trimitere Story

```javascript
await realtime.directCommands.sendUserStory({
  threadId: threadId,
  storyId: 'story_12345',
  text: 'Uite ce story-e pe'
});
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `storyId` (string) - ID-ul story-ului
- `text` (string) - Opțional: mesaj

---

## 12. MARK AS SEEN - Marcare Mesaj ca Citit

```javascript
await realtime.directCommands.markAsSeen({
  threadId: threadId,
  itemId: messageId
});
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `itemId` (string) - ID-ul mesajului

---

## 13. INDICATE ACTIVITY (TYPING) - Arăta că Scrii

```javascript
// Start typing
await realtime.directCommands.indicateActivity({
  threadId: threadId,
  isActive: true
});

// Stop typing
await realtime.directCommands.indicateActivity({
  threadId: threadId,
  isActive: false
});
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `isActive` (boolean) - true = scrii, false = ai terminat

---

## 14. SUBSCRIBE TO FOLLOW NOTIFICATIONS

```javascript
await realtime.directCommands.subscribeToFollowNotifications();

// Ascultă notificări
realtime.on('follow', (data) => {
  console.log('New follower:', data.user_id);
});
```

---

## 15. SUBSCRIBE TO MENTION NOTIFICATIONS

```javascript
await realtime.directCommands.subscribeToMentionNotifications();

// Ascultă notificări
realtime.on('mention', (data) => {
  console.log('You were mentioned in:', data.content_type);
});
```

---

## 16. SUBSCRIBE TO CALL NOTIFICATIONS

```javascript
await realtime.directCommands.subscribeToCallNotifications();

// Ascultă notificări
realtime.on('call', (data) => {
  console.log('Incoming call from:', data.caller_id);
});
```

---

## 17. ADD MEMBER TO THREAD - Adăugare User în Grup

```javascript
await realtime.directCommands.addMemberToThread(threadId, userId);
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `userId` (string) - ID-ul user-ului de adăugat

---

## 18. REMOVE MEMBER FROM THREAD - Ștergere User din Grup

```javascript
await realtime.directCommands.removeMemberFromThread(threadId, userId);
```

**Parametri:**
- `threadId` (string) - ID-ul grupului
- `userId` (string) - ID-ul user-ului de șters

---

## FULL EXAMPLE - Folosire Completă

```javascript
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

(async () => {
  const ig = new IgApiClient();
  await ig.login({ username: 'your_username', password: 'your_password' });

  const realtime = new RealtimeClient(ig);
  const inbox = await ig.direct.getInbox();
  
  await realtime.connect({
    graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
    skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
    irisData: inbox
  });

  const threadId = inbox.inbox.threads[0].thread_id;

  // 1. Send message
  await realtime.directCommands.sendTextViaRealtime(threadId, 'Salut!');

  // 2. Show typing
  await realtime.directCommands.indicateActivity({ threadId, isActive: true });
  await new Promise(r => setTimeout(r, 2000));
  await realtime.directCommands.indicateActivity({ threadId, isActive: false });

  // 3. Listen for replies
  realtime.on('message', (data) => {
    console.log('Message received:', data.message.text);
  });

  // 4. Subscribe to notifications
  await realtime.directCommands.subscribeToFollowNotifications();
  await realtime.directCommands.subscribeToMentionNotifications();

  realtime.on('follow', (data) => {
    console.log('New follower:', data.user_id);
  });

  realtime.on('mention', (data) => {
    console.log('Mentioned in:', data.content_type);
  });
})();
```

---

## QUICK REFERENCE - Cheat Sheet

| Funcție | Utilizare | Cod |
|---------|-----------|-----|
| Send Text | Mesaj text | `sendTextViaRealtime(threadId, text)` |
| Delete | Ștergere mesaj | `deleteMessage(threadId, itemId)` |
| Edit | Editare mesaj | `editMessage(threadId, itemId, newText)` |
| Reply | Răspuns | `replyToMessage(threadId, messageId, text)` |
| Reaction | Emoji | `sendReaction({ threadId, itemId, emoji })` |
| Media | Imagine/Video | `sendMedia({ threadId, mediaId })` |
| Location | Locație | `sendLocation({ threadId, locationId })` |
| Profile | Profil user | `sendProfile({ threadId, userId })` |
| Hashtag | Hashtag | `sendHashtag({ threadId, hashtag })` |
| Like | Like | `sendLike({ threadId })` |
| Story | Story | `sendUserStory({ threadId, storyId })` |
| Seen | Citit | `markAsSeen({ threadId, itemId })` |
| Typing | Scriu | `indicateActivity({ threadId, isActive })` |
| Follow | Abonare follow | `subscribeToFollowNotifications()` |
| Mention | Abonare mention | `subscribeToMentionNotifications()` |
| Call | Abonare apel | `subscribeToCallNotifications()` |
| Add Member | Adăugare | `addMemberToThread(threadId, userId)` |
| Remove Member | Ștergere | `removeMemberFromThread(threadId, userId)` |
