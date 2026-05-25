# WorkTrack

[![Build and Push Docker Images](https://github.com/cuongnn68/worktrack/actions/workflows/docker.yml/badge.svg)](https://github.com/cuongnn68/worktrack/actions/workflows/docker.yml)

Track your team's daily tasks with points and leaderboards.

## Features

- **Group-based** — create groups with a join code, members join by 6-char code
- **Task tracking** — log who did what task and when
- **Points system** — each task type has configurable points
- **Leaderboard** — see top contributors by week or month
- **Calendar view** — week (Mon–Sun columns) and month (grid) views
- **Admin controls** — configure task types, points, manage members
- **Google login** — sign in with your Google account
- **Multi-group** — join unlimited groups, switch between them instantly

---

## Quick Start (Docker)

### Prerequisites

- Docker and Docker Compose
- A Google Cloud project with OAuth2 credentials

### 1. Set up Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add this Authorized Redirect URI:
   ```
   http://localhost/api/auth/google/callback
   ```
7. Copy the **Client ID** and **Client Secret**

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=a-long-random-secret-string

# Optional — defaults work for local Docker
GOOGLE_REDIRECT_URL=http://localhost/api/auth/google/callback
FRONTEND_URL=http://localhost
```

### 3. Run

**Option A — build from source** (`docker-compose.yml`):

```bash
docker compose up --build
```

**Option B — use prebuilt images from GHCR** (`docker-compose.prod.yml`):

Add to your `.env`:

```env
GITHUB_REPOSITORY_OWNER=cuongnn68
TAG=latest  # optional, defaults to latest
GOOGLE_REDIRECT_URL=http://localhost/api/auth/google/callback
FRONTEND_URL=http://localhost
```

Then run:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Open **http://localhost** in your browser.

---

## Local Development (without Docker)

Run the backend and frontend separately for faster iteration.

### Backend

```bash
cd backend
export GOOGLE_CLIENT_ID=your-id
export GOOGLE_CLIENT_SECRET=your-secret
export GOOGLE_REDIRECT_URL=http://localhost:8080/api/auth/google/callback
export FRONTEND_URL=http://localhost:5173
export JWT_SECRET=dev-secret
export DB_PATH=./worktrack.db
go run .
```

> Backend listens on **http://localhost:8080**

### Frontend

In a separate terminal:

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8080" > .env.local
npm run dev
```

> Frontend available at **http://localhost:5173**

> **Note:** For local dev, register this redirect URI in Google Cloud Console:
> `http://localhost:8080/api/auth/google/callback`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | — | Google OAuth2 Client ID (required) |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth2 Client Secret (required) |
| `JWT_SECRET` | — | Secret for signing JWT tokens (required) |
| `GOOGLE_REDIRECT_URL` | `http://localhost/api/auth/google/callback` | OAuth2 callback URL |
| `FRONTEND_URL` | `http://localhost` | Frontend URL (backend redirects here after login) |
| `PORT` | `8080` | Backend server port |
| `DB_PATH` | `/data/worktrack.db` | SQLite database file path |

---

## Architecture

```
┌──────────────────────┐     ┌──────────────────────┐
│   Frontend           │     │   Backend            │
│   React 18 + Vite    │────▶│   Go + Chi router    │
│   Nginx (port 80)    │     │   SQLite (WAL mode)  │
│   Tailwind CSS       │     │   JWT + Google OAuth │
└──────────────────────┘     └──────────────────────┘
                                        │
                              ┌─────────────────────┐
                              │   Docker Volume      │
                              │   /data/worktrack.db │
                              └─────────────────────┘
```

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, date-fns |
| Backend | Go 1.21, Chi router |
| Database | SQLite (via modernc.org/sqlite — no CGO) |
| Auth | Google OAuth2, JWT (30-day tokens) |
| Container | Docker + Nginx reverse proxy |

---

## Usage

### Creating a group

1. Sign in with Google
2. Click **Create Group** in the navbar
3. Share the 6-character **join code** with your team (visible in Admin → Group Settings)

### Joining a group

1. Sign in with Google
2. Click **Join Group** and enter the join code

### Logging a task

- **Week view:** Click **+ Log** at the bottom of any day column
- **Month view:** Click any day cell
- Select the task type, set the time, add an optional note

### Admin setup

After creating a group, go to the **Admin** tab to:
- Add task types (name + points)
- Edit or deactivate existing task types
- View all members
- Copy the join code

---

## Project Structure

```
worktrack/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── main.go
│   ├── db/db.go               # SQLite layer + all models
│   ├── middleware/
│   │   ├── auth.go            # JWT validation
│   │   └── ratelimit.go       # Rate limiting
│   └── handlers/
│       ├── auth.go            # Google OAuth2
│       ├── groups.go          # Group CRUD
│       ├── tasks.go           # Task type CRUD
│       ├── logs.go            # Task logs + leaderboard
│       └── helpers.go         # Shared utilities
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── api.js
        ├── App.jsx
        ├── contexts/AuthContext.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   └── DashboardPage.jsx
        └── components/
            ├── Navbar.jsx
            ├── CalendarView.jsx
            ├── Leaderboard.jsx
            ├── AdminPanel.jsx
            ├── LogTaskModal.jsx
            └── GroupModals.jsx
```
