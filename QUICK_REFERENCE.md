# ⚡ Quick Reference Card

## 🚀 One-Command Setup (After Prerequisites)

```bash
# 1. Clone
git clone https://github.com/recallai/google-meet-meeting-bot.git
cd google-meet-meeting-bot

# 2. Install
npm install && npx playwright install

# 3. Configure .env (edit with your credentials)
cat > .env << 'EOF'
DATABASE_URL=postgresql://meetingbot:supersecret@postgres:5432/meetingbotpoc
OPENAI_API_KEY=sk-your-key-here
GOOGLE_ACCOUNT_USER=bot@gmail.com
GOOGLE_ACCOUNT_PASSWORD=your-password
EOF

# 4. Authenticate
npm run gen:auth:manual

# 5. Build & Start
docker-compose build --no-cache && docker compose up -d

# 6. Migrate
docker compose exec backend npx prisma migrate deploy

# 7. Rebuild
docker-compose build --no-cache && docker compose up -d

# 8. Frontend (separate terminal)
cd src/frontend && npm install && npm run dev
```

**Done!** Open http://localhost:5173

---

## 📋 Daily Commands

### Start:
```bash
docker compose up -d
cd src/frontend && npm run dev
```

### Stop:
```bash
docker compose down
kill $(lsof -ti:5173)
```

### View Database:
```bash
docker exec -it meetingbot-db psql -U meetingbot -d meetingbotpoc
```

---

## 🎯 Usage

1. Open http://localhost:5173
2. Start Google Meet (set to "Open")
3. Paste URL → Click "Start Bot"
4. Turn on captions
5. Speak 2-3 minutes
6. Say "Bot, please leave"
7. Wait 30s → View summary!

---

## 🔧 Exit Commands

Any of these work:
- "Bot, please leave" ✅
- "Notetaker, please leave" ✅
- "Note taker, please leave" ✅
- Leave meeting (bot auto-exits in 30s) ✅

---

## 📊 Ports

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Database: localhost:5432

---

## 🐛 Quick Fixes

**Bot won't join?**
```bash
npm run gen:auth:manual
docker-compose build bot && docker compose restart
```

**No summary?**
- Check OpenAI key in `.env`
- Speak for 2+ minutes
- Wait 30 seconds after bot leaves

**Frontend broken?**
```bash
kill $(lsof -ti:5173)
cd src/frontend && npm run dev
```

---

## 📁 Key Files

✅ Keep these in Git:
- All `.ts`, `.js`, `.html`, `.css` files
- `docker-compose.yml`
- `package.json` files
- Migration files

❌ Never commit:
- `.env` (credentials)
- `auth.json` (authentication)
- `node_modules/` (dependencies)

---

**Full guide:** [FRESH_SETUP_GUIDE.md](./FRESH_SETUP_GUIDE.md)

