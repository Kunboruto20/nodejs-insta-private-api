# GitHub Publishing Guide

## 📋 Step-by-Step Instructions

### 1️⃣ Get Your GitHub Token

1. Go to: https://github.com/settings/tokens/new
2. Select "Tokens (classic)"
3. Click "Generate new token (classic)"
4. **Scopes needed:**
   - ✅ `repo` (full control of repositories)
   - ✅ `admin:repo_hook`
5. Copy the token (starts with `ghp_`)

### 2️⃣ Configure Git Locally

Run these commands in your terminal (NOT in Replit):

```bash
git config --global user.name "Kunboruto20"
git config --global user.email "gyovanyy147@gmail.com"
```

### 3️⃣ Clone or Navigate to Repository

If you haven't cloned yet:
```bash
git clone https://github.com/Kunboruto20/nodejs-insta-private-api.git
cd nodejs-insta-private-api
```

Or if already in the directory, set the remote:
```bash
git remote add origin https://github.com/Kunboruto20/nodejs-insta-private-api.git
```

### 4️⃣ Add & Commit All Files

```bash
git add -A
git commit -m "v5.57.10: Complete library with MQTT sending, bulk messaging, updated docs"
```

### 5️⃣ Push with Token

When pushing, use your token as the password:

```bash
git push -u origin main
```

When prompted:
- **Username:** `Kunboruto20`
- **Password:** (paste your GitHub token here)

### 6️⃣ Alternative: Use Token in URL

```bash
git push https://Kunboruto20:YOUR_TOKEN@github.com/Kunboruto20/nodejs-insta-private-api.git main
```

Replace `YOUR_TOKEN` with your actual token.

---

## 📁 Files Ready to Push

These files are prepared in your Replit project:

✅ **Core Library:**
- `package.json` - v5.57.10
- `package-lock.json`
- `dist/` - Compiled library

✅ **Documentation:**
- `README.md` - Complete with 5 examples + MQTT sending
- `LIBRARY_USAGE_EXAMPLE.md` - How to use the library
- `QUICK_START.txt`
- `HOW_TO_USE_BOT.md`
- `BULK_SENDER_USAGE.txt`

✅ **Example Scripts:**
- `send-messages.js` - Full bulk sender
- `interactive-instagram-bot.js`
- `bulk-dm-sender.js`
- Other example scripts

✅ **Configuration:**
- `scripts/publish-npm.sh` - NPM publish script
- `.gitignore` (if needed)

---

## 🔐 Security Tips

1. **NEVER commit your token to git** ✅
2. Use `git credentials` for automatic auth
3. Delete token after if it's exposed
4. Use fine-grained tokens with specific permissions

---

## ✅ What Gets Pushed

**Total Package:**
- 📦 Library v5.57.10
- 📚 Complete documentation
- 🤖 5 working bot examples
- 📋 Usage guides
- 🔧 npm publish script

**Repository will have:**
```
nodejs-insta-private-api/
├── dist/              (Compiled library)
├── scripts/           (Publishing scripts)
├── README.md          (Main documentation)
├── package.json       (v5.57.10)
├── LIBRARY_USAGE_EXAMPLE.md
├── send-messages.js   (Bulk sender example)
├── And more...
```

---

## 🚀 Done!

After pushing:
1. Visit: https://github.com/Kunboruto20/nodejs-insta-private-api
2. You'll see all the files
3. NPM package already published at: https://npmjs.com/package/nodejs-insta-private-api

Both GitHub & NPM now have your complete library v5.57.10! ✅
