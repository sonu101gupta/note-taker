# 🚀 Google Meet Bot - Fresh Setup Guide

**Complete step-by-step guide to set up this project on a new machine**

---

## 📋 Prerequisites (Install These First)

### 1. **Install Docker Desktop**
- Download from: https://docs.docker.com/get-started/get-docker/
- Install and **start Docker Desktop**
- Verify: `docker --version`

### 2. **Install Node.js**
- **macOS:** 
  ```bash
  brew install node
  ```
- **Linux:**
  ```bash
  sudo apt install nodejs npm
  ```
- Verify: `node -v` and `npm -v`

### 3. **Install Git**
- Download from: https://git-scm.com/downloads
- Verify: `git --version`

### 4. **Required Accounts**
- ✅ **Second Google Account** (for the bot to join meetings)
  - Create at: https://accounts.google.com
  - This will be your bot account (different from your personal account)
- ✅ **OpenAI API Key**
  - Get from: https://platform.openai.com/account/api-keys
  - You'll need credits in your OpenAI account

---

## 🛠️ Setup Steps

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/recallai/google-meet-meeting-bot.git
cd google-meet-meeting-bot
```

---

### **Step 2: Install Dependencies**

```bash
# Install root dependencies
npm install

# Install Playwright browsers
npx playwright install
```

**Expected:** ~240 packages installed, Playwright browsers downloaded

---

### **Step 3: Create Environment Configuration**

Create a `.env` file in the project root:

```bash
# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://meetingbot:supersecret@postgres:5432/meetingbotpoc
OPENAI_API_KEY=your-actual-openai-api-key-here
GOOGLE_ACCOUNT_USER=your-bot-email@gmail.com
GOOGLE_ACCOUNT_PASSWORD=your-bot-password
EOF
```

**⚠️ Important:** Replace the placeholder values:
- `OPENAI_API_KEY`: Your actual OpenAI API key (starts with `sk-proj-...`)
- `GOOGLE_ACCOUNT_USER`: Your bot's Google email
- `GOOGLE_ACCOUNT_PASSWORD`: Your bot's Google password

**Note:** The `DATABASE_URL` should stay as-is (it points to the Docker PostgreSQL container)

---

### **Step 4: Generate Google Authentication**

This step logs in to Google and saves authentication cookies:

```bash
npm run gen:auth:manual
```

**What happens:**
1. A browser window will open
2. **Manually log in** with your **bot Google account**
3. Complete any 2FA or security checks
4. Wait until you see the Google Meet homepage
5. Browser will close automatically
6. `auth.json` file will be created (14KB)

**If Google blocks the login:** The manual script uses enhanced settings to bypass most blocks. Just complete the login manually in the browser.

---

### **Step 5: Start Docker Desktop**

**macOS:**
1. Press `Cmd + Space`
2. Type "Docker"
3. Open Docker Desktop
4. Wait for it to fully start (Docker icon in menu bar stops animating)

**Verify Docker is running:**
```bash
docker ps
```
Should show an empty table (not an error).

---

### **Step 6: Build Docker Containers**

```bash
docker-compose build --no-cache
```

**Expected:** This will build 3 containers:
- `meetingbot-backend` - Express API server
- `meetingbot-bot` - Playwright bot runner
- `postgres:15` - PostgreSQL database

**Duration:** ~5-10 minutes (downloads images and builds)

---

### **Step 7: Start Docker Services**

```bash
docker compose up -d
```

**Verify all containers are running:**
```bash
docker ps
```

You should see:
- `meetingbot-backend` (port 3001)
- `meetingbot-db` (port 5432)
- `google-meet-meeting-bot-main-bot-1`

---

### **Step 8: Run Database Migrations**

```bash
# Open a shell in the backend container
docker compose exec backend sh

# Run migrations
npx prisma migrate deploy

# Exit the container
exit
```

**Expected output:**
```
6 migrations found in prisma/migrations
Applying migration...
All migrations have been successfully applied.
```

---

### **Step 9: Rebuild After Migrations**

```bash
docker-compose build --no-cache
docker compose up -d
```

This ensures all services have the latest database schema.

---

### **Step 10: Start the Frontend**

Open a **new terminal window** and run:

```bash
cd src/frontend
npm install
npm run dev
```

**Expected output:**
```
VITE v5.4.19  ready in 123 ms
➜  Local:   http://localhost:5173/
```

**Keep this terminal open** - the frontend runs here.

---

## ✅ Verification & Testing

### **1. Check All Services Are Running**

```bash
# Check Docker containers
docker ps

# Expected:
# - meetingbot-backend (Up, port 3001)
# - meetingbot-db (Up, port 5432)

# Check frontend
curl http://localhost:5173
# Should return HTML
```

### **2. Test the System**

**a) Start a Google Meet:**
1. Go to https://meet.google.com
2. Log in with **YOUR PERSONAL account** (NOT the bot account)
3. Click "New Meeting" → "Start an instant meeting"
4. **IMPORTANT:** Click "Host Controls" → Set "Meeting Access" to **"Open"**

**b) Submit to Bot:**
1. Open http://localhost:5173 in your browser
2. Copy your meeting URL (e.g., `https://meet.google.com/abc-defg-hij`)
3. Paste it in the form and click "Start Bot"

**c) Watch the Bot:**
1. The bot should join within 15-20 seconds
2. You'll see `sonu01gupta2703@gmail.com` (or your bot email) in participants
3. Turn on **captions** (CC button) in the meeting

**d) View Live Transcript:**
1. In the dashboard, go to "Live Transcript" section
2. Select your meeting from the dropdown
3. Speak in the meeting - you'll see words appear in real-time!

**e) End the Recording:**
Say clearly: **"Bot, please leave"**

Or alternatives:
- "Notetaker, please leave"
- "Note taker, please leave"

Or just leave the meeting yourself - bot will auto-exit after 30 seconds.

**f) View the Summary:**
1. Wait 15-30 seconds for OpenAI to process
2. Scroll down to "Past Meetings" section
3. You'll see your meeting with AI-generated summary!

---

## 🎯 What You'll See in the Dashboard

### **Three Main Sections:**

**1. 🚀 Start New Meeting Recording**
- Input field for Google Meet URL
- Submit button
- Status messages

**2. 🔴 Live Transcript**
- Dropdown to select active meetings
- Real-time transcript updates (every 3 seconds)
- Auto-scroll to latest
- Works for late joiners!

**3. 📚 Past Meetings**
- List of completed meetings with AI summaries
- Shows only meetings with actual summaries
- Meeting ID, date/time, segment count
- Full AI-generated summary for each meeting

---

## 🐛 Troubleshooting

### **Bot doesn't join the meeting:**

**Check 1: Meeting Access**
- Ensure meeting is set to **"Open"** (not "People you invited")
- Go to Host Controls → Meeting Access → Open

**Check 2: Authentication**
```bash
# Check if auth.json exists and is recent
ls -lh auth.json

# If it's old or missing, regenerate:
npm run gen:auth:manual
```

**Check 3: Docker Services**
```bash
# Check if all containers are running
docker ps

# Check backend logs for errors
docker logs meetingbot-backend -f
```

**Check 4: Meeting Link**
- Use only the base URL: `https://meet.google.com/xxx-xxxx-xxx`
- Don't include `?authuser=` or other parameters

---

### **Exit command not working:**

**Try these variations:**
- "Bot, please leave" (simplest)
- "Notetaker, please leave"
- "Note taker, please leave"

**Or:**
- Just leave the meeting yourself
- Bot will auto-exit after being alone for 30 seconds

---

### **No summary generated:**

**Check 1: OpenAI API Key**
```bash
# Verify your .env file has valid key
cat .env | grep OPENAI
```

**Check 2: Transcript Length**
- OpenAI needs some content to summarize
- Speak for at least 1-2 minutes before ending

**Check 3: Backend Logs**
```bash
docker logs meetingbot-backend | grep -i summary
```

---

### **Frontend not loading:**

```bash
# Check if frontend is running
lsof -ti:5173

# If not running, start it:
cd src/frontend
npm run dev

# If already running, restart it:
kill $(lsof -ti:5173)
cd src/frontend
npm run dev
```

---

### **Database issues:**

```bash
# Check database is running
docker ps | grep meetingbot-db

# Access database for debugging
docker exec -it meetingbot-db psql -U meetingbot -d meetingbotpoc

# Inside psql, check tables:
\dt

# View summaries:
SELECT * FROM "MeetingSummary" ORDER BY "generatedAt" DESC LIMIT 5;

# Exit:
exit
```

---

## 🔄 Daily Usage

### **Starting the System:**

```bash
cd /path/to/google-meet-meeting-bot

# Start Docker services
docker compose up -d

# In a separate terminal, start frontend:
cd src/frontend
npm run dev
```

**Access:** http://localhost:5173

---

### **Stopping the System:**

```bash
# Stop Docker
docker compose down

# Stop frontend
kill $(lsof -ti:5173)
```

---

### **Viewing Data:**

**Access Database:**
```bash
docker exec -it meetingbot-db psql -U meetingbot -d meetingbotpoc
```

**View Latest Summary:**
```sql
SELECT "meetingId",
       "generatedAt",
       "summaryText"
FROM   "MeetingSummary"
ORDER  BY "generatedAt" DESC
LIMIT  1;
```

**View Latest Transcript:**
```sql
SELECT t."meetingId",
       t."createdAt",
       json_agg(
         json_build_object(
           'speaker', s.speaker,
           'text',    s.text
         )
         ORDER BY s.start
       ) AS segments
FROM   "MeetingTranscript" t
JOIN   "Segment"           s USING ("meetingId")
WHERE  t."meetingId" = (
          SELECT "meetingId"
          FROM   "MeetingTranscript"
          ORDER  BY "createdAt" DESC
          LIMIT  1
      )
GROUP  BY t."meetingId", t."createdAt";
```

**Exit Database:**
```
exit
```

---

## 📁 Important Files (DO NOT Commit to Git)

These files are already in `.gitignore`:
- ✅ `.env` - Contains your API keys and passwords
- ✅ `auth.json` - Contains Google authentication cookies

**Never commit these to version control!**

---

## 🎨 Features Overview

### **Core Features:**
- ✅ Automatically joins Google Meet meetings
- ✅ Scrapes live captions in real-time
- ✅ Saves transcripts to PostgreSQL
- ✅ Generates AI summaries using OpenAI GPT-4.1
- ✅ Modern web dashboard for management

### **Enhanced Features:**
- ✅ **Live Transcript Viewer** - See transcripts in real-time
- ✅ **Late Joiner Support** - Join anytime and see full transcript
- ✅ **Smart Filtering** - Only shows meetings with summaries
- ✅ **Auto-Exit** - Bot leaves when alone (30s timeout)
- ✅ **Flexible Exit Commands** - Multiple phrase variations
- ✅ **Auto-Refresh** - Dashboard updates automatically
- ✅ **Professional UI** - Modern, responsive design

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                          │
│              http://localhost:5173                       │
│         (Frontend Dashboard - Vite/TypeScript)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP REST API
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Express)                       │
│              http://localhost:3001                       │
│    ┌──────────────────────────────────────────────┐    │
│    │  Endpoints:                                    │    │
│    │  - POST /submit-link                          │    │
│    │  - GET  /meetings                             │    │
│    │  - GET  /active-meetings                      │    │
│    │  - GET  /live-transcript/:meetingId           │    │
│    │  - POST /bot-done                             │    │
│    │  - POST /bot-started                          │    │
│    └──────────────────────────────────────────────┘    │
└────────────┬───────────────────────┬────────────────────┘
             │                       │
             │                       │ Launches Bot
             │                       ▼
             │        ┌──────────────────────────────┐
             │        │   Bot Container (Playwright)  │
             │        │   - Joins Google Meet         │
             │        │   - Scrapes captions          │
             │        │   - Detects exit phrases      │
             │        └──────────────────────────────┘
             │
             │ Prisma ORM
             ▼
┌─────────────────────────────────────────────────────────┐
│         PostgreSQL Database (localhost:5432)             │
│  ┌────────────────┬──────────────┬─────────────────┐   │
│  │ MeetingTranscript│ MeetingSummary│  MeetingJob   │   │
│  │   - meetingId   │  - summaryText│   - status    │   │
│  │   - createdAt   │  - model      │   - meetingUrl│   │
│  │   - segments    │  - generatedAt│   - meetingId │   │
│  └────────────────┴──────────────┴─────────────────┘   │
└─────────────────────────────────────────────────────────┘
             │
             │ Sends transcript
             ▼
┌─────────────────────────────────────────────────────────┐
│              OpenAI API (GPT-4.1)                        │
│           Generates AI Summaries                         │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Setup Script

Copy and paste this entire script for automated setup:

```bash
#!/bin/bash

# Quick Setup Script for Google Meet Bot
echo "🚀 Starting Google Meet Bot Setup..."

# 1. Clone repository (skip if already done)
# git clone https://github.com/recallai/google-meet-meeting-bot.git
# cd google-meet-meeting-bot

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install
npx playwright install

# 3. Create .env file (you'll need to edit this manually)
echo "📝 Creating .env file..."
cat > .env << 'EOF'
DATABASE_URL=postgresql://meetingbot:supersecret@postgres:5432/meetingbotpoc
OPENAI_API_KEY=your-actual-openai-api-key-here
GOOGLE_ACCOUNT_USER=your-bot-email@gmail.com
GOOGLE_ACCOUNT_PASSWORD=your-bot-password
EOF

echo "⚠️  IMPORTANT: Edit .env file with your actual credentials!"
echo "   - OpenAI API Key"
echo "   - Google bot account email"
echo "   - Google bot account password"
echo ""
read -p "Press ENTER after you've updated the .env file..."

# 4. Generate authentication
echo "🔐 Generating Google authentication..."
echo "   A browser will open - log in with your bot account"
npm run gen:auth:manual

# 5. Build Docker containers
echo "🐳 Building Docker containers (this takes 5-10 minutes)..."
docker-compose build --no-cache

# 6. Start services
echo "▶️  Starting Docker services..."
docker compose up -d

# Wait for services to start
sleep 5

# 7. Run database migrations
echo "📊 Running database migrations..."
docker compose exec backend npx prisma migrate deploy

# 8. Rebuild and restart
echo "🔄 Rebuilding and restarting..."
docker-compose build --no-cache
docker compose up -d

# 9. Start frontend (in background)
echo "🎨 Starting frontend..."
cd src/frontend
npm install
npm run dev &

# Wait for frontend to start
sleep 3

echo ""
echo "✅ =========================================="
echo "✅  SETUP COMPLETE!"
echo "✅ =========================================="
echo ""
echo "🌐 Open your browser and go to:"
echo "   👉 http://localhost:5173"
echo ""
echo "📚 Next steps:"
echo "   1. Start a Google Meet with your personal account"
echo "   2. Set meeting access to 'Open'"
echo "   3. Paste the meeting URL in the dashboard"
echo "   4. Watch the bot join and record!"
echo ""
echo "🛑 To stop: docker compose down && kill \$(lsof -ti:5173)"
echo ""
```

**Save this as `quick-setup.sh`, make it executable, and run:**
```bash
chmod +x quick-setup.sh
./quick-setup.sh
```

---

## 📝 Manual Setup Checklist

Use this if you prefer step-by-step manual setup:

- [ ] Install Docker Desktop
- [ ] Install Node.js and npm
- [ ] Install Git
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Install Playwright: `npx playwright install`
- [ ] Create `.env` file with your credentials
- [ ] Run `npm run gen:auth:manual` and complete Google login
- [ ] Start Docker Desktop application
- [ ] Run `docker-compose build --no-cache`
- [ ] Run `docker compose up -d`
- [ ] Run `docker compose exec backend npx prisma migrate deploy`
- [ ] Run `docker-compose build --no-cache` again
- [ ] Run `docker compose up -d` again
- [ ] Run `cd src/frontend && npm install && npm run dev`
- [ ] Open http://localhost:5173
- [ ] Test with a real Google Meet

---

## 🎯 First Test Instructions

### **Complete Test Flow:**

**1. Prepare the Meeting (2 minutes):**
```
- Open Google Meet (personal account)
- Create instant meeting
- Set access to "Open" (Host Controls)
- Copy meeting URL
```

**2. Start Bot (30 seconds):**
```
- Go to http://localhost:5173
- Paste URL and click "Start Bot"
- Wait for bot to join
```

**3. Record Transcript (2-3 minutes):**
```
- Turn on captions (CC button)
- Speak clearly for 2-3 minutes
- Watch "Live Transcript" dropdown - select your meeting
- See real-time updates!
```

**4. End Recording (5 seconds):**
```
- Say: "Bot, please leave"
- Bot exits immediately
```

**5. View Summary (30 seconds):**
```
- Wait for OpenAI processing
- Check "Past Meetings" section
- See AI-generated summary!
```

---

## 📂 Project Structure

```
google-meet-meeting-bot/
├── .env                    # Your credentials (DO NOT commit)
├── auth.json              # Google auth (DO NOT commit)
├── docker-compose.yml     # Docker orchestration
├── Dockerfile.be          # Backend container
├── Dockerfile.bot         # Bot container
├── package.json           # Root dependencies
├── scripts/
│   ├── generate-auth.js          # Auto-login script
│   └── generate-auth-manual.js   # Manual login script (better)
├── src/
│   ├── backend/
│   │   ├── server.ts              # Express API with 6 endpoints
│   │   ├── launchBot.ts           # Bot launcher
│   │   ├── schema.prisma          # Database schema
│   │   └── migrations/            # 6 migration files
│   ├── bot/
│   │   └── index.ts               # Bot entry point
│   ├── frontend/
│   │   ├── index.html             # Dashboard UI
│   │   ├── main.ts                # Frontend logic
│   │   └── style.css              # Styling
│   ├── playwright/
│   │   ├── runBot.ts              # Main bot logic
│   │   ├── storage.ts             # Database operations
│   │   └── summarize.ts           # OpenAI integration
│   └── models.ts                  # TypeScript types
└── README.md
```

---

## 🔐 Security Notes

### **Sensitive Files:**
These files contain credentials and should NEVER be committed to Git:
- `.env` - API keys and passwords
- `auth.json` - Google authentication cookies

Both are already in `.gitignore` ✅

### **Best Practices:**
1. ✅ Use a dedicated Google account for the bot
2. ✅ Don't use your personal Google account as the bot
3. ✅ Keep your OpenAI API key secret
4. ✅ Regularly rotate your bot account password
5. ✅ Monitor your OpenAI usage/costs

---

## 💰 Cost Considerations

### **OpenAI API Costs:**
- **Model:** GPT-4.1 (or configured model)
- **Cost per summary:** Approximately $0.01-0.05 (depends on transcript length)
- **Recommendation:** Monitor your OpenAI dashboard for usage

### **Infrastructure:**
- ✅ **FREE** - All services run locally on your laptop
- ✅ **No cloud hosting costs**
- ✅ **PostgreSQL runs in Docker** (no external database needed)

---

## 🎓 Additional Resources

### **Documentation:**
- Playwright: https://playwright.dev/
- Prisma: https://www.prisma.io/docs
- OpenAI API: https://platform.openai.com/docs
- Docker: https://docs.docker.com/

### **Original Project:**
- Blog post: https://www.recall.ai/blog/how-we-built-an-in-house-google-meet-bot
- Recall.ai (production solution): https://www.recall.ai/

---

## ✅ Setup Complete!

Your Google Meet Bot is ready to use! 🎉

**Access your dashboard at:** http://localhost:5173

**For support or issues:**
- Check the troubleshooting section above
- Review Docker logs: `docker logs meetingbot-backend -f`
- Check database: `docker exec -it meetingbot-db psql -U meetingbot -d meetingbotpoc`

**Happy meeting recording!** 📹🤖

