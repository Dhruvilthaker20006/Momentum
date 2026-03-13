# ⚡ Momentum — Habit Tracker (Full Stack)

> Node.js + Express + MongoDB backend with JWT auth, email reminders, and a beautiful frontend.

---

## 📁 Project Structure

```
momentum/
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema (auth, reminders)
│   │   └── Habit.js         # Habit schema with embedded completions
│   ├── routes/
│   │   ├── auth.js          # Signup, login, profile, password reset
│   │   └── habits.js        # CRUD + toggle completions + stats
│   ├── middleware/
│   │   └── auth.js          # JWT protect middleware
│   ├── utils/
│   │   ├── email.js         # Nodemailer (welcome, reminder, reset)
│   │   └── scheduler.js     # node-cron daily reminder job
│   ├── server.js            # Express app entry point
│   ├── package.json
│   └── .env.example         # ← Copy to .env and fill in your values
│
└── frontend/
    └── index.html           # Single-file frontend (works standalone)
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+
- **MongoDB** (local or [Atlas free tier](https://mongodb.com/atlas))
- **Gmail** (for email reminders — use an [App Password](https://support.google.com/accounts/answer/185833))

### 2. Install & Configure Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and email credentials
```

### 3. Start the Backend

```bash
npm start
# OR for hot reload during development:
npm run dev
```

Server runs at → **http://localhost:5000**
Health check   → **http://localhost:5000/api/health**

### 4. Open the Frontend

Simply open `frontend/index.html` in your browser. It auto-connects to `http://localhost:5000/api`.

> To change the API URL, edit the `API_BASE` constant at the top of the `<script>` tag in `index.html`.

---

## 🔌 REST API Reference

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user profile |
| PATCH | `/api/auth/me` | Update name / reminder settings |
| PATCH | `/api/auth/change-password` | Change password |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

### Habit Endpoints (all require `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | List all habits (optional `?date=YYYY-MM-DD`) |
| GET | `/api/habits/stats` | Daily + weekly stats |
| POST | `/api/habits` | Create a habit |
| PATCH | `/api/habits/:id` | Update a habit |
| DELETE | `/api/habits/:id` | Delete a habit |
| POST | `/api/habits/:id/complete` | Toggle completion for a date |
| GET | `/api/habits/:id/history` | Get completion history (last 30 days) |

### Example: Create a Habit
```json
POST /api/habits
{
  "name": "Read 20 minutes",
  "emoji": "📚",
  "color": "#7c6aff",
  "category": "Mind",
  "frequency": "daily",
  "note": "Before bed"
}
```

### Example: Toggle Completion
```json
POST /api/habits/64abc123/complete
{
  "date": "2025-12-01",
  "note": "Done at 9pm"
}
```

---

## 📧 Email Reminders Setup

1. Go to your Gmail → Google Account → Security → **App Passwords**
2. Generate an App Password for "Mail"
3. In `.env`:
```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
```
4. Users can enable reminders in the **Settings** page inside the app
5. The scheduler runs every minute, sending emails at the user's configured UTC time

---

## 🗄️ MongoDB Schema Overview

### User
```
name, email, password (bcrypt), avatar
reminders: { enabled, time, timezone, days }
resetPasswordToken, resetPasswordExpires
```

### Habit
```
user (ref), name, emoji, color, category, frequency
customDays, note, isArchived
completions: [{ date, completedAt, note }]
```

---

## 🛡️ Security Features

- ✅ Passwords hashed with **bcrypt** (12 rounds)
- ✅ **JWT** authentication (7-day expiry)
- ✅ **Helmet** HTTP security headers
- ✅ **Rate limiting** (100 req/15min global, 10/15min for auth)
- ✅ Input validation with **express-validator**
- ✅ CORS restricted to frontend URL

---

## ☁️ Deployment Tips

### Backend (Railway / Render / Fly.io)
```bash
# Set these environment variables in your platform:
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long random string>
EMAIL_USER=...
EMAIL_PASS=...
CLIENT_URL=https://your-frontend.com
NODE_ENV=production
```

### Frontend
Upload `frontend/index.html` to **Netlify Drop**, **Vercel**, or any static host.
Update `API_BASE` to point to your deployed backend URL.

---

## 📈 Roadmap Ideas

- [ ] Google OAuth login
- [ ] Habit streaks leaderboard
- [ ] Weekly/monthly reports
- [ ] Mobile PWA (offline-first)
- [ ] Habit templates / community library
- [ ] Analytics dashboard
