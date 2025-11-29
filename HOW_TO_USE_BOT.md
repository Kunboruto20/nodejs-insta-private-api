# 🤖 Interactive Instagram DM Bot

## Quick Start

```bash
node interactive-instagram-bot.js
```

## What It Does

1. **Authenticate** - Prompts for your Instagram username & password
2. **Save Session** - Stores login session to avoid repeated login
3. **Listen** - Connects to Instagram MQTT and waits for messages
4. **Auto-Reply** - When you receive a DM, the bot shows it and waits for your reply
5. **Send** - Type your message and press Enter to send via MQTT

## Usage Guide

### First Run
```
📧 Instagram Username: your_username
🔑 Instagram Password: your_password
📨 Email (optional): your_email@gmail.com

⏳ Authenticating...
✅ Logged in! Session saved to session.json
```

### After Login
```
╔════════════════════════════════════════════════════════════╗
║              🤖 Bot is now ACTIVE and listening!            ║
║                                                            ║
║  • Messages will appear as they arrive                      ║
║  • Type your reply and press Enter to send                  ║
║  • Type "exit" to stop the bot                             ║
╚════════════════════════════════════════════════════════════╝

💬 Enter your message (or "exit" to quit): 
```

### When You Receive a Message
```
╔════════════════════════════════════════════════════════════╗
║ 📨 NEW MESSAGE from User 123456789
╠════════════════════════════════════════════════════════════╣
║ Hey! How are you doing?
╚════════════════════════════════════════════════════════════╝

💬 Enter your message (or "exit" to quit): I'm doing great!
📤 Sending...
✅ Message sent!
```

## Features

✅ Interactive command-line interface
✅ Session persistence (no re-login on restart)
✅ Real-time message receiving via MQTT
✅ Instant message delivery via MQTT
✅ Error handling and reconnection
✅ Clean console formatting

## Commands

- `exit` - Stop the bot and exit
- Any text - Sends as reply to the last received message

## Session Management

Your session is automatically saved to `session.json` after first login.

**To logout**: Delete `session.json` file
```bash
rm session.json
```

Next time you run the bot, it will ask for credentials again.

## Troubleshooting

**"Session invalid"** - Your session expired, just login again

**"Not receiving messages"** - Make sure MQTT is connecting (you'll see "Connected!" message)

**"Failed to send"** - Instagram may have rate-limited you. Wait a moment and try again.

## Advanced Options

Edit `interactive-instagram-bot.js` to customize:
- Session file location
- Message formatting
- Automatic responses
- Rate limiting

