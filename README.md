<div align="center">

<img src="client/public/favicon.svg" width="72" height="72" alt="TaskFlow logo" />

# TaskFlow

**Real-time project management for teams** — a Jira/Trello-style app with Kanban boards,
drag & drop, live collaboration, activity logs and notifications.

[**Live demo**](#live-demo) · [API reference](docs/API.md) · [Frontend architecture](docs/FRONTEND.md)

</div>

---

## Live demo

| | |
| --- | --- |
| **App** | **https://taskflow-one-weld.vercel.app** |
| **Repository** | https://github.com/Rudra-Kapoor/taskflow |

### Demo credentials

All demo accounts use the password **`Demo@1234`**.

| Account | Email | Role in demo data |
| --- | --- | --- |
| Demo User (Product Manager) | `demo@example.com` | Owner of _Product Engineering_, member of _Growth & Marketing_ |
| Priya Patel (Backend Developer) | `priya@example.com` | Admin of _Product Engineering_ |
| Aarav Sharma (Frontend Developer) | `aarav@example.com` | Member |
| Rahul Verma (UI/UX Designer) | `rahul@example.com` | Owner of _Growth & Marketing_ |
| Sneha Iyer (QA Engineer) | `sneha@example.com` | Member of _Product Engineering_, admin of _Growth & Marketing_ |
| Karan Mehta (DevOps Engineer) | `karan@example.com` | Member |

> **Try the real-time features:** open the app in two browsers (e.g. a normal and a private window),
> log in as `demo@example.com` and `priya@example.com`, open the same project board and drag a card,
> assign a task or post a comment — the other window updates instantly, shows who is viewing the board
> and receives a notification.

---

## Features

### Core requirements

| Requirement | Implementation |
| --- | --- |
| User authentication | Register / login with JWT (Bearer), bcrypt password hashing, protected routes, session-expiry handling, profile & password management |
| Create and manage projects | Create, edit, archive / restore (read-only when archived), delete with cascade; per-team unique project keys used for task keys (`WEB-12`) |
| Teams and members | Create teams, add members by email, roles (owner / admin / member), change roles, remove members or leave a team |
| Create, edit, delete tasks | Rich task modal with inline editing of every field, quick-add per column, delete with confirmation |
| Assign tasks | Assignee picker limited to team members (validated server-side); removing a member unassigns their tasks |
| Deadlines & priorities | Due dates with _overdue / due today / due soon_ indicators, 4 priority levels (Low → Urgent) |
| Task status | To Do · In Progress · Completed (completion timestamp tracked) |
| Comments | Add, edit, delete; live updates for everyone viewing the task |
| Search & filtering | Global task search across all projects (text, status, priority, assignee, due date, project, sorting, pagination) + instant board filters (shareable via URL) |
| Responsive, friendly UI | Mobile drawer navigation, horizontally scrollable board, dark mode, skeleton loaders, empty states, toasts, keyboard shortcuts |

### Advanced features

| Feature | Implementation |
| --- | --- |
| Drag-and-drop task board | `@hello-pangea/dnd` board with fractional positioning (O(1) writes per move, automatic re-balancing) and optimistic updates with rollback |
| Real-time updates | Socket.IO rooms per user / team / project; tasks, comments, activity, projects and teams sync live; **presence** shows who is viewing a board; automatic resync after reconnect |
| Activity logs | Every change to teams, projects, tasks and comments is recorded with a readable snapshot; project, task and global feeds with cursor pagination |
| Notifications | Task assignment, status changes, comments, team invitations and **due-within-24h reminders** (background job); live toast + bell dropdown + notifications page, read/unread state |

### Extras

- Dashboard with personal stats, status & priority breakdowns, upcoming deadlines, recent activity and project progress
- Role-based permission matrix enforced on the API (see [docs/API.md](docs/API.md#permission-matrix))
- Consistent API envelope, Zod validation on every input, centralized error handling, Helmet security headers,
  production rate limiting, session revocation on password change, privacy-preserving user search
- 277 automated API + Socket.IO integration tests (Vitest, Supertest, socket.io-client) and GitHub Actions CI
- One-command local setup, Docker image, Render blueprint and GitHub Actions CI

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 6, Tailwind CSS 3, TanStack Query 5, React Router 6, React Hook Form + Zod, @hello-pangea/dnd, Socket.IO client, lucide-react, date-fns |
| Backend | Node.js 20+, Express 4, Socket.IO 4, Mongoose 8 (MongoDB), Zod, JSON Web Tokens, bcrypt |
| Tooling | npm workspaces, ESLint 9, Prettier, Vitest + Supertest, Docker, Render, GitHub Actions |

---

## Architecture

```mermaid
flowchart LR
  subgraph Browser["React SPA"]
    UI[Pages & components] --> RQ[TanStack Query cache]
    RQ -->|REST /api| AX[Axios client]
    SC[Socket.IO client] -->|events patch the cache| RQ
  end

  AX -->|HTTP + JWT| EX
  SC <-->|WebSocket + JWT| IO

  subgraph Server["Node.js server (single origin)"]
    EX[Express routes] --> MW[auth · validate · rate-limit]
    MW --> CT[Controllers]
    CT --> SV[Services: access, position, activity, notifications]
    SV --> DB[(MongoDB)]
    SV -->|emit to rooms| IO[Socket.IO server]
    JOB[Due-date reminder job] --> SV
  end
```

- **Layered backend:** `routes → validate (Zod) → controller → services → models`. Controllers stay thin;
  authorization (`access.service`), ordering (`position.service`), audit logging (`activity.service`) and
  notifications (`notification.service`) are reusable services.
- **Single source of truth on the client:** server state lives in the TanStack Query cache. Mutations
  update it optimistically; Socket.IO events from other users patch the same cache, so every view (board,
  task modal, dashboard, lists) stays consistent without page reloads.
- **One deployable:** in production Express also serves the built React app, so the API, WebSockets and UI
  share one origin (no CORS / cookie issues, one URL to share).

### Real-time design

| Room | Joined | Used for |
| --- | --- | --- |
| `user:<id>` | automatically on connect | notifications, "you were added/removed" events |
| `team:<id>` | automatically for each team (and when added) | activity feed, project & team changes |
| `project:<id>` | when a board / task is open (membership verified) | task & comment changes, presence |

- Socket connections are authenticated with the same JWT as the REST API.
- Writes go through REST (validated, authorized); the server then broadcasts the canonical document.
  Clients upsert by `_id` and ignore stale payloads (`updatedAt`), so events are idempotent.
- After a reconnect the client invalidates its cache to recover anything missed while offline.
- Presence is kept in memory per project (a Redis adapter would be added for multiple server instances).

### Drag & drop ordering

Each task has a floating-point `position` inside its status column. A drop sends only the ids of the
neighbouring cards; the server places the task between them (midpoint), so a move is a single document
write. When two positions get too close the column is re-balanced and the new positions are broadcast.
Because neighbours are sent instead of indexes, drag & drop works correctly even while board filters hide
some cards.

---

## Database design

```mermaid
erDiagram
  USER ||--o{ TEAM_MEMBER : "is"
  TEAM ||--|{ TEAM_MEMBER : "has"
  TEAM ||--o{ PROJECT : "owns"
  PROJECT ||--o{ TASK : "contains"
  USER ||--o{ TASK : "assignee / creator"
  TASK ||--o{ COMMENT : "has"
  USER ||--o{ COMMENT : "writes"
  USER ||--o{ ACTIVITY : "performs"
  USER ||--o{ NOTIFICATION : "receives"

  USER { ObjectId _id string name string email "unique" string password "bcrypt, never returned" string title string avatarColor }
  TEAM { ObjectId _id string name string description ObjectId owner array members "embedded: user, role, joinedAt" }
  PROJECT { ObjectId _id ObjectId team string key "unique per team" string name string status "active|archived" number taskSeq }
  TASK { ObjectId _id ObjectId project number number string status string priority ObjectId assignee date dueDate number position number commentCount }
  COMMENT { ObjectId _id ObjectId task ObjectId project ObjectId author string body }
  ACTIVITY { ObjectId _id ObjectId actor string action ObjectId team ObjectId project ObjectId task mixed meta "snapshot" }
  NOTIFICATION { ObjectId _id ObjectId recipient ObjectId actor string type string message bool read }
```

Design notes:

- **Team members are embedded** in the team document (small, bounded, always read together) and indexed
  on `members.user`, which is the root of every authorization check.
- **Comments, activity and notifications are separate collections** (unbounded growth).
- **Denormalised counters** — `Task.commentCount` and `Project.taskSeq` (atomic `$inc` for `WEB-12`
  numbering) avoid aggregations on hot paths.
- **Activity stores a `meta` snapshot** (task key/title, from → to values), so the log stays readable after
  a task is deleted.
- **Indexes** match the query patterns: `{project, status, position}` for board columns,
  `{assignee, status, dueDate}` for "my tasks" and reminders, `{project, createdAt}` / `{task, createdAt}` /
  `{team, createdAt}` for feeds, `{recipient, read, createdAt}` for notifications, plus a 90-day TTL index on
  notifications and a unique `{team, key}` index on projects.

---

## Getting started

### Prerequisites

- Node.js **20+** and npm 9+
- MongoDB — any of:
  - Docker: `docker compose up -d mongo` (recommended), or
  - a MongoDB Atlas connection string, or
  - nothing at all: in development, if `MONGO_URI` is empty the server starts an embedded MongoDB
    (`mongodb-memory-server`, data persisted to `server/.data`).

### Setup

```bash
git clone <your-repo-url> taskflow && cd taskflow
npm install                                # installs server + client (npm workspaces)
cp server/.env.example server/.env         # then set MONGO_URI, e.g. mongodb://127.0.0.1:27017/taskflow
docker compose up -d mongo                 # optional: local MongoDB in Docker
npm run dev                                # API on :5000, React app on :5173
```

Open **http://localhost:5173** and sign in with `demo@example.com` / `Demo@1234`.
The database is seeded with demo data automatically on first start when it is empty
(`SEED_ON_EMPTY_DB=true`). Run `npm run seed` at any time to wipe and re-seed it.

### Scripts (run from the repository root)

| Command | Description |
| --- | --- |
| `npm run dev` | Start API (with file watching) and Vite dev server together |
| `npm run build` | Build the React app into `client/dist` |
| `npm start` | Start the production server (serves the API, Socket.IO and `client/dist`) |
| `npm run seed` | **Wipe** the database and load the demo data |
| `npm test` | Run the API + real-time integration tests |
| `npm run lint` | Lint server and client |

### Environment variables (`server/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `PORT` | `5000` | HTTP port |
| `MONGO_URI` | _(empty)_ | MongoDB connection string (**required in production**) |
| `JWT_SECRET` | dev fallback | Secret for signing tokens (**required in production**, ≥ 16 chars) |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CLIENT_URL` | `http://localhost:5173` | Comma-separated origins allowed by CORS / Socket.IO |
| `SEED_ON_EMPTY_DB` | `false` | Seed demo data when the database has no users |
| `TRUST_PROXY` | `0` | Number of reverse proxies in front of the server (`1` on Render). `0` ignores `X-Forwarded-For`, so clients can't spoof their IP past the rate limits |

Rate limits (login/register and the whole API) are enforced only when `NODE_ENV=production`.

Client (`client/.env`, optional): `VITE_API_URL` and `VITE_SOCKET_URL` — only needed when the API is hosted
on a different origin than the React app. Leave empty to use the same origin / the Vite dev proxy.

---

## Deployment

### Vercel + MongoDB Atlas (live demo)

The live demo runs on Vercel ([`vercel.json`](vercel.json)): the React build is served as static files and
the whole Express API + Socket.IO server runs as one serverless function (`api/index.js` ->
`server/src/serverless.js`). Serverless functions cannot hold WebSocket connections, so on Vercel Socket.IO
would need sticky sessions, which Vercel doesn't offer, so the Vercel build sets `VITE_REALTIME_MODE=poll`: every
open view (board, task, notifications, dashboard) refreshes itself every 4 s instead of receiving pushes. The database is MongoDB Atlas provisioned through the Vercel Marketplace
(it injects `MONGODB_URI`). For full WebSocket transport and the due-date reminder job, use a long-running
host such as Render (below) or Docker.

### Render + MongoDB Atlas (long-running server, free tier)

1. **MongoDB Atlas:** create a free M0 cluster → _Database Access_: add a user → _Network Access_: allow
   `0.0.0.0/0` → _Connect → Drivers_: copy the connection string and add a database name, e.g.
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority`.
2. Push this repository to GitHub.
3. **Render:** _New → Blueprint_ → select the repository (it reads [`render.yaml`](render.yaml)).
   Set `MONGO_URI` to the Atlas string. `JWT_SECRET` is generated automatically and `CLIENT_URL`
   defaults to the Render service URL.
4. Deploy. On first boot the empty database is seeded with the demo accounts.

The free Render plan sleeps after 15 minutes of inactivity; the first request afterwards takes ~30-60 s.

Demo due dates are relative to the moment the data is seeded. To refresh them (e.g. right before a
review), re-seed the live database from your machine: `MONGO_URI="<atlas-uri>" npm run seed`.

### Docker

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose --profile app up --build   # MongoDB + app on http://localhost:5000
```

Or build the image alone: `docker build -t taskflow .` and run it with `MONGO_URI` / `JWT_SECRET`.

---

## Project structure

```
.
├── client/                    React SPA (Vite)
│   └── src/
│       ├── api/               axios client + one module per resource
│       ├── components/        ui/ (design system), layout/, board/, tasks/, projects/, teams/, ...
│       ├── context/           Auth, Socket (real-time + presence), Theme
│       ├── hooks/queries/     TanStack Query hooks (optimistic updates, cache sync)
│       ├── lib/               query keys, cache helpers, formatters, constants
│       ├── pages/             route components
│       └── realtime/          Socket.IO event → cache handlers
├── server/                    Express + Socket.IO API
│   ├── src/
│   │   ├── config/            env validation, database connection
│   │   ├── controllers/       request handlers (thin)
│   │   ├── jobs/              due-date reminder job
│   │   ├── middleware/        auth, validation, rate limiting, error handling
│   │   ├── models/            Mongoose schemas + indexes
│   │   ├── routes/            REST routes
│   │   ├── services/          access control, ordering, activity, notifications
│   │   ├── socket/            Socket.IO auth, rooms, presence, emitters
│   │   ├── seed/              demo data
│   │   ├── validators/        Zod request schemas
│   │   ├── app.js             Express app factory
│   │   └── index.js           bootstrap + graceful shutdown
│   └── tests/                 Vitest integration tests
├── docs/                      API reference, frontend architecture
├── Dockerfile, docker-compose.yml, render.yaml
└── package.json               npm workspaces + root scripts
```

---

## Testing

```bash
npm test
```

The tests run against a throwaway database: an in-memory MongoDB by default, or a real server when
`MONGO_TEST_URI` is set (e.g. `MONGO_TEST_URI=mongodb://127.0.0.1:27017 npm test`).

---

## API overview

All endpoints live under `/api` and return `{ success, data, meta? }` or
`{ success: false, message, errors? }`. Full reference: **[docs/API.md](docs/API.md)**.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /auth/me`, `PATCH /auth/me/password` |
| Teams | `GET/POST /teams`, `GET/PATCH/DELETE /teams/:id`, `POST /teams/:id/members`, `PATCH/DELETE /teams/:id/members/:userId` |
| Projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `GET/POST /projects/:id/tasks`, `GET /projects/:id/activity` |
| Tasks | `GET /tasks` (search), `GET/PATCH/DELETE /tasks/:id`, `PATCH /tasks/:id/move`, `GET/POST /tasks/:id/comments`, `GET /tasks/:id/activity` |
| Comments | `PATCH/DELETE /comments/:id` |
| Notifications | `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`, `DELETE /notifications/:id` |
| Other | `GET /activity`, `GET /dashboard`, `GET /users/search`, `GET /health` |

---

## Design decisions & trade-offs

- **REST for writes, WebSockets for fan-out** — every mutation is validated and authorized in one place;
  sockets only broadcast results. This keeps the real-time layer simple and secure.
- **JWT in `Authorization` header** (stored in `localStorage`) keeps the API stateless and works across
  origins; an httpOnly refresh-token cookie would be the next hardening step.
- **MongoDB** fits the document-shaped data (tasks with labels, embedded team members, activity snapshots);
  relations that need integrity (assignee ∈ team, cascade deletes) are enforced in the service layer.
- **Single-instance presence** is held in memory; scaling horizontally would add the Socket.IO Redis adapter.

### Possible next steps

Email invitations for users without an account, file attachments, sub-tasks, @mentions, sprints/boards per
team, and end-to-end tests in CI.

---

Built by **Rudra Kapoor** ([@Rudra-Kapoor](https://github.com/Rudra-Kapoor)).
