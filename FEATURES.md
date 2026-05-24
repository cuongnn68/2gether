# 2Gether — Feature Reference

> Quick reference for what the app does and how it's built. Organized by domain.

---

## Business Features

### Authentication
- Sign in with Google (OAuth2) — no username/password
- Session lasts 30 days (JWT stored in `localStorage`)
- Profile synced from Google on every login: name, email, avatar

### Groups
- **Create** a group with a name and optional description
- **Join** a group via a 6-character alphanumeric invite code
- **Multiple groups** — a user can belong to and switch between many groups
- **Two roles**: `admin` (creator) and `member`
- Admin can **edit** group name and description
- Admin can **refresh the join code** — old code immediately invalidated, new one generated
- Admin can **kick members** from the group (cannot kick themselves)
- Join attempts are **rate-limited**: 10 per IP per 5 minutes

### Task Types
- Admin creates **task types** for the group (e.g. "Morning Run", "Read 30 mins")
- Each task type has a name, optional description, and a **point value** (min 1)
- Admin can **edit** any task type (name, description, points, active/inactive)
- **Soft delete**: deactivating a task type hides it from members but preserves historical logs
- Active types shown to members; all types (including inactive) visible to admins

### Activity Logging
- Any member can **log a completed task** by selecting a task type and a date/time
- Optional **note** field per log entry
- Date defaults to now; members can backdate entries
- Members can **delete their own logs**
- Admins can **delete any log** in the group
- Logs are group-scoped — members only see their group's activity

### Calendar
- **Week view**: navigate week by week, log tasks per day
  - Mobile: vertical stack of day cards (one card per day, readable on small screens)
  - Desktop: 7-column grid with compact task cards per column
- **Month view**: grid of the full month
  - Tap any day → bottom sheet shows all activities for that day with totals
  - "+ Log Task" button in the sheet logs directly to that day
- Navigation: previous/next period, jump to today
- After logging, calendar auto-refreshes without closing the day detail sheet

### Leaderboard
- Shows **total points and task count** per member for the selected period
- Two periods: **this week** (Mon–Sun) and **this month**
- All group members appear (even those with 0 points)
- Ranked by total points descending

### Admin Panel
- View and copy the group's **join code**
- Refresh join code with one click
- **Members list**: name, avatar, role, join date
- Kick any member (except yourself) with a confirm dialog
- Edit group name and description

---

## Technical Features

### Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3 |
| Font | Nunito (Google Fonts) |
| HTTP client | axios (JWT auto-attached via interceptor) |
| Backend | Go, chi router |
| Database | SQLite via `modernc.org/sqlite` (pure Go, no CGO) |
| Auth tokens | `golang-jwt/jwt` (HS256) |
| OAuth | `golang.org/x/oauth2` + Google endpoint |

### Backend Architecture
- Single binary, all config via environment variables (`PORT`, `DB_PATH`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`, `GOOGLE_REDIRECT_URL`)
- `db/` — database layer: schema migration, typed model structs, all SQL queries
- `handlers/` — HTTP handlers, one file per domain (`auth`, `groups`, `tasks`, `logs`)
- `middleware/` — JWT authentication, rate limiting
- Schema auto-migrated on startup with `CREATE TABLE IF NOT EXISTS`
- SQLite in WAL mode, `MaxOpenConns(1)` to prevent "database is locked"
- Foreign keys enforced (`PRAGMA foreign_keys=ON`)
- All IDs are UUIDs (`github.com/google/uuid`)

### API Design
- REST, JSON, all routes under `/api/`
- Auth: `Bearer <jwt>` header on all protected routes
- Public routes: `GET /api/auth/google/login`, `GET /api/auth/google/callback`
- Group-scoped routes: `/api/groups/{id}/...`
- Consistent error shape: `{"error": "message"}` with appropriate HTTP status codes

### Security
- **CSRF protection on OAuth**: random state stored in `HttpOnly` cookie, validated on callback
- **JWT verification** on every protected request (middleware extracts `sub` claim as user ID)
- **Rate limiting**: fixed-window counter per client IP, reusable as chi middleware (`RateLimit(n, window)`)
  - Respects `X-Real-IP` and `X-Forwarded-For` for proxy deployments
  - Background goroutine cleans up expired entries (no memory leak)
- **Authorization checks** on every mutating endpoint — membership and role verified server-side, never trusted from client
- **Log delete**: only owner or group admin may delete a log entry
- **Task type delete**: soft-delete only — historical logs remain intact and queryable
- **Admin self-kick prevention**: server rejects if callerID == targetID

### Frontend Architecture
- Single-page app, React Router not used — group switching handled via state in `DashboardPage`
- `AuthContext` — global user state, token bootstrap from URL param on OAuth return
- `api.js` — all API calls centralized, axios instance with JWT interceptor
- Component breakdown: `Navbar`, `CalendarView`, `Leaderboard`, `AdminPanel`, `LogTaskModal`, `GroupModals`

### Mobile UX Patterns
- **Bottom-sheet modals**: `items-end` on mobile, `items-center` on desktop (`sm:` breakpoint)
- Drag handle indicator on mobile sheets
- `max-h-[90vh] flex flex-col` with scrollable body and pinned footer buttons
- `WeekView` renders two completely different layouts — mobile stack (`sm:hidden`) vs desktop grid (`hidden sm:grid`) — no horizontal scroll
- `DayDetailModal` (z-40) stacks under `LogTaskModal` (z-50) so logging from a day sheet keeps the sheet visible underneath

### Deployment
- Docker Compose: `frontend` (nginx, serves Vite build, proxies `/api` to backend) + `backend` (Go binary) + shared volume for SQLite file
- `VITE_API_URL` defaults to `""` (empty string) so the nginx proxy is used in production without reconfiguring the frontend
