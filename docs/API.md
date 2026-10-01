# TaskFlow API Reference

Base URL: `/api` (e.g. `http://localhost:5000/api`). All request and response bodies are JSON.

## Conventions

### Authentication

Every endpoint except `POST /auth/register`, `POST /auth/login` and `GET /health` requires a JWT:

```
Authorization: Bearer <token>
```

The same token is passed to Socket.IO in the handshake (`io(url, { auth: { token } })`).

Tokens are HS256 JWTs (no other algorithm is accepted) with `sub` = user id and `ver` = the
account's token version. **Changing the password revokes every token issued before**: requests with
an older token get `401 "Your session has expired. Please log in again."` and socket handshakes fail
with `"Invalid or expired token"`. Tokens without `ver` (issued before versioning) count as version 0.

### Response envelope

Successful responses:

```json
{ "success": true, "data": <payload>, "meta": { ... } }
```

`meta` is only present on paginated or cursor-based lists. Some endpoints that only confirm an
action return `{ "success": true, "message": "..." }` without `data`; `PATCH /auth/me/password`
returns both (`{ "success": true, "message": "...", "data": { "token": "..." } }`).

Error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "location": "body", "message": "Invalid email" }]
}
```

| Status | Meaning                                                     |
| ------ | ----------------------------------------------------------- |
| 400    | Validation failed / malformed request / business rule error |
| 401    | Missing, invalid, expired or revoked token; wrong credentials |
| 403    | Authenticated but not allowed (not a member, wrong role)    |
| 404    | Resource or route does not exist                            |
| 409    | Conflict (duplicate email, duplicate project key, ...)      |
| 413    | Payload too large                                           |
| 415    | Unsupported body encoding (e.g. a JSON body with `charset=latin1`) |
| 429    | Rate limited                                                |
| 500    | Unexpected server error                                     |

Client errors raised while reading the request (body parser) keep their 4xx status and message.

Rate limits are per client IP (production only). Behind a reverse proxy, set the server's
`TRUST_PROXY` to the number of proxies in front of it (`1` on Render); with the default `0` the
`X-Forwarded-For` header is ignored, so clients cannot spoof their IP to escape the limits.

### Identifiers and dates

- IDs are MongoDB ObjectIds serialised as 24-char hex strings in the `_id` field.
- Dates are ISO-8601 strings (UTC). `dueDate` is a full timestamp; the web client sends the
  **end of the selected local day** (23:59:59.999 local time) so a task is overdue only after its
  due day has passed.
- `dueDate` input must be an ISO 8601 date-time **with** `Z` or an offset
  (`2030-01-15T18:29:59.999Z`, `2030-01-15T23:59:59+05:30`) or a plain date `YYYY-MM-DD`
  (stored as midnight UTC), with a year from 2000 to 2100; `null` or `""` clears it. Anything else
  (numbers, booleans, `"2024"`, `"12/31/99"`, `"2030-02-30"`, a date-time without timezone) is a
  `400` on `dueDate`.
- Endpoints that reason about "today" accept `tzOffset` = the browser's
  `new Date().getTimezoneOffset()` (minutes, e.g. IST = `-330`). Default `0`.

### Pagination

Page-based lists accept `page` (default 1) and `limit` (default 20, max 100) and return:

```json
"meta": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
```

Activity feeds use cursor pagination, newest first: pass the previous page's `nextCursor` as
`before`, plus `limit` (default 20, max 50). They return:

```json
"meta": { "nextCursor": "2026-10-01T09:30:00.000Z_6650c0ffee0000000000abcd", "hasMore": true }
```

`nextCursor` is `<ISO createdAt>_<_id>` of the last item of the page (`null` on the last page);
treat it as opaque. Every page except the last holds exactly `limit` items, and entries recorded in
the same millisecond are never skipped. A plain ISO date is still accepted as `before` (returns
entries strictly older than that instant). Any other value is a `400` on `before`.

---

## Resource shapes

### UserPublic

```json
{ "_id": "...", "name": "Aarav Sharma", "email": "aarav@example.com", "title": "Frontend Developer", "avatarColor": "#6366f1" }
```

The authenticated user's own profile (`/auth/register`, `/auth/login`, `/auth/me`) is the same plus
`createdAt` / `updatedAt`. Passwords are never returned.

### Team

```json
{
  "_id": "...",
  "name": "Product Engineering",
  "description": "Builds the core product",
  "owner": UserPublic,
  "members": [{ "user": UserPublic, "role": "owner" | "admin" | "member", "joinedAt": "ISO" }],
  "myRole": "owner" | "admin" | "member",
  "projectCount": 3,
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

### Project

```json
{
  "_id": "...",
  "name": "TaskFlow Web App",
  "key": "WEB",
  "description": "...",
  "color": "#6366f1",
  "status": "active" | "archived",
  "team": { "_id": "...", "name": "Product Engineering" },
  "createdBy": UserPublic,
  "taskCounts": { "todo": 3, "in_progress": 2, "completed": 5, "total": 10 },
  "myRole": "owner" | "admin" | "member",
  "lastActivityAt": "ISO",
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

`GET /projects/:projectId` returns the same shape, but `team` is the **full Team** (with populated
`members`, without `myRole`/`projectCount`). The team's members are the people who can be assigned
tasks in the project.

`lastActivityAt` is when something last happened in the project: the `createdAt` of its newest
activity entry (task created / edited / moved to another column / assigned / deleted, comment
added, project created or edited) or a drag-and-drop reorder inside a column. Use it for "active X
ago"; `updatedAt` only changes when the project itself is edited. It is not re-broadcast on every
change: when an `activity:created` event with a `project` arrives, set that project's
`lastActivityAt` to the event's `createdAt` (reorders are only picked up on the next fetch).

### Task

```json
{
  "_id": "...",
  "project": { "_id": "...", "name": "TaskFlow Web App", "key": "WEB", "color": "#6366f1", "team": "<teamId>" },
  "number": 12,
  "title": "Implement login page",
  "description": "Markdown-free plain text",
  "status": "todo" | "in_progress" | "completed",
  "priority": "low" | "medium" | "high" | "urgent",
  "assignee": UserPublic | null,
  "createdBy": UserPublic,
  "dueDate": "ISO" | null,
  "labels": ["frontend", "auth"],
  "position": 2048,
  "commentCount": 3,
  "completedAt": "ISO" | null,
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

The human-readable task key is built client-side as `${task.project.key}-${task.number}` (e.g. `WEB-12`).
Within a status column, tasks are ordered by ascending `position`.

### Comment

```json
{
  "_id": "...",
  "task": "<taskId>",
  "project": "<projectId>",
  "author": UserPublic,
  "body": "Looks good to me!",
  "editedAt": "ISO" | null,
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

### Activity

```json
{
  "_id": "...",
  "actor": UserPublic,
  "action": "task.status_changed",
  "team": "<teamId>",
  "project": "<projectId>" | null,
  "task": "<taskId>" | null,
  "meta": { ... },
  "createdAt": "ISO"
}
```

`meta` is a snapshot so entries stay readable after the referenced task/project is deleted. Every
project-scoped action (`project.*`, `task.*`, `comment.*`) includes `projectName` and `projectKey`.

| action                     | meta                                                                     |
| -------------------------- | ------------------------------------------------------------------------ |
| `team.created`             | `{ teamName }`                                                           |
| `team.updated`             | `{ teamName, fields: ["name", "description"] }`                          |
| `team.member_added`        | `{ teamName, memberId, memberName, role }`                               |
| `team.member_removed`      | `{ teamName, memberId, memberName, left: boolean }`                      |
| `team.member_role_changed` | `{ teamName, memberId, memberName, from, to }`                           |
| `project.created`          | `{ projectName, projectKey }`                                            |
| `project.updated`          | `{ projectName, projectKey, fields: [...], changes: [{ field, from, to }] }` |
| `project.deleted`          | `{ projectName, projectKey }`                                            |
| `task.created`             | `{ projectName, projectKey, taskKey, taskTitle, status }`                |
| `task.updated`             | `{ projectName, projectKey, taskKey, taskTitle, changes: [{ field, from, to }] }` |
| `task.status_changed`      | `{ projectName, projectKey, taskKey, taskTitle, from, to }`              |
| `task.assigned`            | `{ projectName, projectKey, taskKey, taskTitle, from: {_id,name}\|null, to: {_id,name}\|null }` |
| `task.deleted`             | `{ projectName, projectKey, taskKey, taskTitle }`                        |
| `comment.added`            | `{ projectName, projectKey, taskKey, taskTitle, commentId, excerpt }`    |

For `task.updated`, `changes[].field` is one of `title`, `description`, `priority`, `dueDate`, `labels`.
For `description` the `from`/`to` values are omitted (`null`) to keep the log small.
`project.updated` `changes` only lists `status` (`active`/`archived`) and `name`.

### Notification

```json
{
  "_id": "...",
  "recipient": "<userId>",
  "actor": UserPublic | null,
  "type": "task_assigned" | "task_status_changed" | "task_commented" | "task_due_soon" | "team_member_added",
  "message": "Priya Patel assigned you WEB-12: Implement login page",
  "team": "<teamId>" | null,
  "project": { "_id": "...", "name": "...", "key": "WEB", "color": "#..." } | null,
  "task": "<taskId>" | null,
  "read": false,
  "readAt": "ISO" | null,
  "createdAt": "ISO"
}
```

Notifications are created for:

| type                  | recipients                                      | trigger                                      |
| --------------------- | ----------------------------------------------- | -------------------------------------------- |
| `task_assigned`       | new assignee                                    | task created with / changed to an assignee   |
| `task_status_changed` | assignee + creator                              | status changed (edit or drag-and-drop)       |
| `task_commented`      | assignee + creator                              | comment added                                |
| `task_due_soon`       | assignee                                        | background job, task due within 24 h (once)  |
| `team_member_added`   | added user                                      | added to a team                              |

The user who performed the action never receives a notification about it.

---

## Endpoints

### Health

| Method | Path      | Response                                   |
| ------ | --------- | ------------------------------------------ |
| GET    | `/health` | `{ status: "ok", uptime, timestamp }`      |

Returns `503 Database unavailable` when MongoDB is not connected (used by Render/Docker health checks).

### Auth

| Method | Path                | Body                                         | Response            |
| ------ | ------------------- | -------------------------------------------- | ------------------- |
| POST   | `/auth/register`    | `{ name, email, password }`                  | `201 { user, token }` (`409` if the email is taken) |
| POST   | `/auth/login`       | `{ email, password }`                        | `{ user, token }`   |
| GET    | `/auth/me`          | -                                            | `{ user }`          |
| PATCH  | `/auth/me`          | `{ name?, title?, avatarColor? }` (min 1)    | `{ user }`          |
| PATCH  | `/auth/me/password` | `{ currentPassword, newPassword }`           | message + `{ token }` |

Validation: `name` 2-60 chars; `email` valid; `password` 8-72 chars containing at least one letter
and one number; `avatarColor` `#RRGGBB`; `title` max 80 chars. The new password must differ from the
current one. Login and register are rate limited (30 requests / 15 min / IP).

Registering an email that already has an account (case-insensitive, also when two sign-ups race)
returns `409` with the field, so forms can show it under the email input:

```json
{
  "success": false,
  "message": "An account with this email already exists",
  "errors": [{ "field": "email", "location": "body", "message": "An account with this email already exists" }]
}
```

**Changing the password ends every session**, including the one that made the request:

```json
{ "success": true, "message": "Password updated successfully", "data": { "token": "<new JWT>" } }
```

- All previously issued tokens (other tabs, other devices, the token used for this request) now get
  `401 "Your session has expired. Please log in again."`. Store `data.token` and use it from now on.
- All of the user's open sockets are disconnected by the server (`disconnect` reason
  `"io server disconnect"`); reconnecting with an old token fails with `"Invalid or expired token"`,
  so reconnect with the new token. The disconnect is sent before the HTTP response, so a client
  that reconnects immediately may still try the old token once.
- A failed attempt (wrong `currentPassword`, validation error) changes nothing.

**Profile edits are pushed live**: a `PATCH /auth/me` that changes something sends `user:updated`
(the new `UserPublic`) to the user's teammates and to their own other tabs, and re-broadcasts
`presence:update` on the boards they are viewing (see "Real-time"). Saving unchanged values sends
nothing.

### Users

| Method | Path            | Query                                 | Response                         |
| ------ | --------------- | ------------------------------------- | -------------------------------- |
| GET    | `/users/search` | `q` (2-100 chars), `excludeTeam?`     | `UserPublic[]` (max 8, never you) |

Finds people to add to a team without exposing the user directory:

- **Teammates** (users who share at least one team with you) are matched when their name or email
  _contains_ `q` (case-insensitive), sorted by name.
- **Anyone else** is only returned when `q` is their **exact email address** (case-insensitive).
- An exact email match is listed first, followed by the matching teammates.
- `excludeTeam` (a team you belong to, else `403`) hides that team's current members, including
  from the exact email match.

### Teams

| Method | Path                              | Body / Query                         | Who                 | Response    |
| ------ | --------------------------------- | ------------------------------------ | ------------------- | ----------- |
| GET    | `/teams`                          | -                                    | member              | `Team[]`    |
| POST   | `/teams`                          | `{ name, description? }`             | any user            | `201 Team`  |
| GET    | `/teams/:teamId`                  | -                                    | member              | `Team`      |
| PATCH  | `/teams/:teamId`                  | `{ name?, description? }`            | owner/admin         | `Team`      |
| DELETE | `/teams/:teamId`                  | -                                    | owner               | message     |
| POST   | `/teams/:teamId/members`          | `{ email, role?: "admin"\|"member" }` | owner/admin (`admin` role: owner) | `201 Team`  |
| PATCH  | `/teams/:teamId/members/:userId`  | `{ role: "admin"\|"member" }`         | owner               | `Team`      |
| DELETE | `/teams/:teamId/members/:userId`  | -                                    | owner/admin or self | message     |

Rules: the creator becomes `owner`. Members are added by the email of an **existing** account
(404 if none, 409 if already a member). Admins can add people as `member` only: adding someone with
`role: "admin"` is reserved to the owner (`403 "Only the team owner can add admins"`), like changing
roles. The owner's role cannot be changed and the owner cannot be removed or leave (delete the team
instead). Admins can remove `member`s only; the owner can remove anyone. Removing a member unassigns
their tasks in the team's projects. Deleting a team deletes its projects, tasks, comments, activity
and notifications (see "Notifications" for how recipients are told).

### Projects

| Method | Path                              | Body / Query                                                    | Who         | Response       |
| ------ | --------------------------------- | --------------------------------------------------------------- | ----------- | -------------- |
| GET    | `/projects`                       | `search?`, `team?`, `status?` = `active` (default) \| `archived` \| `all` | member | `Project[]` |
| POST   | `/projects`                       | `{ name, key, team, description?, color? }`                     | owner/admin | `201 Project`  |
| GET    | `/projects/:projectId`            | -                                                               | member      | `Project` (full team) |
| PATCH  | `/projects/:projectId`            | `{ name?, key?, description?, color?, status? }`                | owner/admin | `Project`      |
| DELETE | `/projects/:projectId`            | -                                                               | owner/admin | message        |
| GET    | `/projects/:projectId/tasks`      | -                                                               | member      | `Task[]` (all tasks, sorted by status then position) |
| POST   | `/projects/:projectId/tasks`      | `{ title, description?, status?, priority?, assignee?, dueDate?, labels? }` | member | `201 Task` |
| GET    | `/projects/:projectId/activity`   | `before?`, `limit?`                                             | member      | `Activity[]` + cursor meta |

Validation: `name` 2-100 chars; `key` 2-6 chars, uppercase letters/digits, starting with a letter,
unique within the team (409); `description` max 1000; `color` `#RRGGBB`; `status` `active|archived`.
Projects are sorted by `lastActivityAt` desc (most recently active first, then newest `_id`).
`search` matches name, key or description.

**Archived projects are read-only**: creating, editing, moving or deleting tasks and comments returns
`400` until the project is restored (`PATCH { status: "active" }`).

### Tasks

| Method | Path                       | Body / Query                                       | Who                         | Response   |
| ------ | -------------------------- | -------------------------------------------------- | --------------------------- | ---------- |
| GET    | `/tasks`                   | see "Search & filters" below                       | member                      | `Task[]` + page meta |
| GET    | `/tasks/:taskId`           | -                                                  | member                      | `Task`     |
| PATCH  | `/tasks/:taskId`           | any of `{ title, description, status, priority, assignee, dueDate, labels }` (min 1) | member | `Task` |
| PATCH  | `/tasks/:taskId/move`      | `{ status, prevTaskId?, nextTaskId? }`             | member                      | `{ task: Task, reordered: [{ _id, position }] }` |
| DELETE | `/tasks/:taskId`           | -                                                  | creator, team owner/admin   | message    |
| GET    | `/tasks/:taskId/comments`  | -                                                  | member                      | `Comment[]` (oldest first) |
| POST   | `/tasks/:taskId/comments`  | `{ body }`                                         | member                      | `201 Comment` |
| GET    | `/tasks/:taskId/activity`  | `before?`, `limit?`                                | member                      | `Activity[]` + cursor meta |

Validation: `title` 1-200 chars; `description` max 5000; `assignee` must be a member of the
project's team (or `null` to unassign); `dueDate` an ISO 8601 date-time with `Z`/offset or a
`YYYY-MM-DD` date, years 2000-2100, or `null`/`""` to clear (see "Identifiers and dates"; errors:
`"Due date must be an ISO 8601 date (YYYY-MM-DD) or date-time with a timezone (Z or +hh:mm)"`,
`"Due date must be between the years 2000 and 2100"`); `labels` max 10 strings of 1-30 chars
(deduplicated, lower-cased); comment `body` 1-2000 chars.

Side effects: changing `status` to `completed` sets `completedAt` (cleared when moved back), and the
task is moved to the end of the target column when the status changes via `PATCH /tasks/:id`.
The `task_due_soon` reminder is sent once per due date, assignee and open period: changing the due
date, changing the assignee, or reopening a completed task (form or drag & drop) re-arms it.

**Drag & drop (`/move`)**: the client sends the target `status` and the ids of the tasks that will
be directly above (`prevTaskId`) and below (`nextTaskId`) the dropped card *as displayed* (filters may
hide tasks; that's fine). The server places the task immediately after `prevTaskId` (or immediately
before `nextTaskId`, or at the end of the column if neither is given) using fractional positions,
re-balancing the column when positions get too close. `reordered` lists any other tasks whose
positions changed during a re-balance (usually empty).

When several people drag at once, the board a card is dropped on can be stale. A neighbour that **no
longer exists or no longer has the target status** (someone deleted it or moved it to another column
meanwhile) is therefore ignored, as if it had not been sent: the card lands next to the other
neighbour, or at the end of the column when neither is usable, and the request succeeds. A neighbour
from **another project**, or the dragged task itself, is still a `400 "Invalid drop position"`.

#### Search & filters (`GET /tasks`)

Searches tasks across the **active** projects the user can access (the same scope as the dashboard
figures, so a stat card and the list it links to always agree). Archived projects are included with
`includeArchived=true`, or by asking for one explicitly with `project`.

| Param      | Values                                                                        |
| ---------- | ----------------------------------------------------------------------------- |
| `search`   | free text; matches title, description or any label (contains, case-insensitive); a task key such as `web-7` also finds that task (project key + number, in the searched projects) |
| `project`  | project id, archived or not (must be accessible, else 403)                    |
| `includeArchived` | `true` \| `false` (default) - also search archived projects (ignored with `project`) |
| `status`   | `todo` \| `in_progress` \| `completed` \| `open` (= not completed)            |
| `priority` | `low` \| `medium` \| `high` \| `urgent`                                       |
| `assignee` | `me` \| `unassigned` \| `<userId>`                                            |
| `due`      | `overdue` \| `today` \| `week` (next 7 days incl. today) \| `none`            |
| `completedWithin` | `1`-`365`: only tasks completed in the last N × 24 h (e.g. `7` = the dashboard's `completedThisWeek`) |
| `sort`     | `updated` (default) \| `newest` \| `oldest` \| `due_asc` \| `due_desc` \| `priority` |
| `page`, `limit`, `tzOffset` | see conventions                                              |

`due_asc` / `due_desc` place tasks without a due date last. `priority` sorts urgent → low.

### Comments

| Method | Path                    | Body       | Who                               | Response  |
| ------ | ----------------------- | ---------- | --------------------------------- | --------- |
| PATCH  | `/comments/:commentId`  | `{ body }` | author                            | `Comment` |
| DELETE | `/comments/:commentId`  | -          | author, team owner/admin          | message   |

### Notifications

| Method | Path                                  | Query / Body                 | Response |
| ------ | ------------------------------------- | ---------------------------- | -------- |
| GET    | `/notifications`                      | `unread?=true`, `page`, `limit` | `Notification[]` + meta `{ page, limit, total, totalPages, unreadCount }` |
| PATCH  | `/notifications/read-all`             | -                            | `{ updated: number }` |
| PATCH  | `/notifications/:notificationId/read` | -                            | `Notification` |
| DELETE | `/notifications/:notificationId`      | -                            | message |

Newest first. Users can only see and modify their own notifications (others -> 404).

Reads and deletions are pushed to all of the user's sockets (every tab and device, including the
one that made the request) so badges and lists stay in sync: `notification:read`,
`notifications:read_all` and `notification:deleted` (see "Real-time"). They are only sent when
something changed (marking an already-read notification, or read-all with nothing unread, sends
nothing).

Notifications are also deleted along with the task, project or team they refer to, and their
recipients are told right away:

| Deleted  | Event sent to each affected recipient                                                     |
| -------- | ----------------------------------------------------------------------------------------- |
| task     | `notification:deleted` `{ _id }` for each of their notifications about the task           |
| project  | `notifications:refresh` `{}` once (however many were removed): refetch the list and count |
| team     | `notifications:refresh` `{}` once, covering its projects' notifications too               |

### Activity feed

| Method | Path        | Query               | Response                                   |
| ------ | ----------- | ------------------- | ------------------------------------------ |
| GET    | `/activity` | `before?`, `limit?` | `Activity[]` from all of the user's teams + cursor meta |

### Dashboard

`GET /dashboard?tzOffset=-330`

```json
{
  "stats": {
    "assignedOpen": 7,        // open tasks assigned to me
    "overdue": 2,             // my open tasks past their due date
    "dueToday": 1,            // my open tasks due today (local day)
    "completedThisWeek": 4,   // my tasks completed in the last 7 days
    "projects": 4,            // active projects I can access
    "teams": 2
  },
  "statusBreakdown": { "todo": 10, "in_progress": 6, "completed": 14 },        // all tasks in my active projects
  "priorityBreakdown": { "low": 1, "medium": 3, "high": 2, "urgent": 1 },     // my open tasks
  "upcomingTasks": [Task]   // my open tasks, nearest due date first (no-due-date last), max 6
}
```

Like `GET /tasks` (without `includeArchived`), every figure covers active projects only, so each
stat matches the `meta.total` of a task search:

| Stat                | Equivalent search                                              |
| ------------------- | -------------------------------------------------------------- |
| `assignedOpen`      | `GET /tasks?assignee=me&status=open`                           |
| `overdue`           | `GET /tasks?assignee=me&due=overdue`                           |
| `dueToday`          | `GET /tasks?assignee=me&status=open&due=today&tzOffset=...`    |
| `completedThisWeek` | `GET /tasks?assignee=me&status=completed&completedWithin=7`    |
| `priorityBreakdown.<p>` | `GET /tasks?assignee=me&status=open&priority=<p>`          |

---

## Real-time (Socket.IO)

Connect to the server origin (same host as the API, path `/socket.io`) with
`io(SERVER_URL, { auth: { token } })`. Invalid tokens are rejected with a `connect_error`
(`"Authentication required"` / `"Invalid or expired token"`); a token revoked by a password change
counts as invalid. Changing the password also disconnects every open socket of the user
(`disconnect` reason `"io server disconnect"`): reconnect with the token returned by
`PATCH /auth/me/password`.

### Heartbeat

The server pings every connection every **10 s** (`pingInterval: 10000`) and closes it when the pong
has not arrived within **5 s** (`pingTimeout: 5000`). A dead connection (closed laptop, lost network)
is therefore dropped within ~15 s instead of ~45 s with Socket.IO's defaults, together with its board
presence (a `presence:update` follows unless the user still has another tab on that board). Clients
receive both values in the handshake, so socket.io-client also notices a dead server within ~15 s
(`disconnect` reason `"ping timeout"`) and reconnects. A new connection starts outside every project
room, so the open board must be joined again (`project:join`).

### Rooms

| Room              | Joined                                                        | Receives                          |
| ----------------- | ------------------------------------------------------------- | --------------------------------- |
| `user:<userId>`   | automatically on connect                                      | notifications (new, read, deleted, refresh), personal team events, own profile edits |
| `team:<teamId>`   | automatically for every team the user belongs to (and when added) | activity, project & team changes, members' profile edits |
| `project:<id>`    | explicitly via `project:join` (membership verified)           | task & comment changes, presence  |

### Client → server

| Event           | Payload                    | Ack                                                  |
| --------------- | -------------------------- | ---------------------------------------------------- |
| `project:join`  | `projectId`                | `({ ok: true, users: UserPublic[] } \| { ok: false, message })` |
| `project:leave` | `projectId`                | -                                                    |

`project:join` checks membership asynchronously. If `project:leave` for the same project arrives
before that check completes, the join is dropped (no room, no presence) and its ack is
`{ ok: false, message: "Left the project before the join completed" }` - expected after a quick
open/close, safe to ignore. The last request wins: join → leave → join (e.g. React StrictMode
effects) ends up joined, and both joins are acknowledged with `ok: true`. Other `ok: false`
messages: `"Invalid project id"`, `"Project not found"`, `"You do not have access to this project"`.

### Server → client

| Event                  | Room     | Payload                                                       |
| ---------------------- | -------- | ------------------------------------------------------------- |
| `presence:update`      | project  | `{ projectId, users: UserPublic[] }` (who is viewing the project) |
| `task:created`         | project  | `Task`                                                        |
| `task:updated`         | project  | `Task` (edits, status changes and moves)                      |
| `task:deleted`         | project  | `{ _id, projectId }`                                          |
| `tasks:reordered`      | project  | `{ projectId, positions: [{ _id, position }] }`               |
| `tasks:refresh`        | project  | `{ projectId }` - bulk change, refetch the board              |
| `comment:created`      | project  | `{ comment: Comment, taskId, projectId, commentCount }`       |
| `comment:updated`      | project  | `{ comment: Comment, taskId, projectId }`                     |
| `comment:deleted`      | project  | `{ _id, taskId, projectId, commentCount }`                    |
| `activity:created`     | team     | `Activity`                                                    |
| `project:created`      | team     | `Project` (list shape, without `myRole`)                      |
| `project:updated`      | team     | `Project` (list shape, without `myRole`)                      |
| `project:deleted`      | team     | `{ _id, teamId }`                                             |
| `team:updated`         | team     | `Team` (without `myRole`)                                     |
| `team:deleted`         | team     | `{ _id }`                                                     |
| `team:added`           | user     | `Team` - you were added to a team                             |
| `team:removed`         | user     | `{ teamId, teamName }` - you were removed from / left a team  |
| `notification:created` | user     | `Notification`                                                |
| `notification:read`    | user     | `{ _id, readAt }` - a notification was marked as read         |
| `notifications:read_all` | user   | `{ readAt }` - all unread notifications were marked as read at `readAt` |
| `notification:deleted` | user     | `{ _id }` - a notification was deleted (by you, or with its task) |
| `notifications:refresh` | user    | `{}` - notifications of yours were deleted along with a project or team: refetch the list and unread count |
| `user:updated`         | team + user | `UserPublic` - a teammate (or you, in another tab) edited their profile |

Events are also delivered to the user who triggered them, so handlers must be idempotent
(upsert by `_id`; ignore an incoming task whose `updatedAt` is older than the cached one).

`user:updated` is emitted to the user's own room and all of their team rooms at once, so each socket
receives it once, even when it shares several teams with the user. Update every cached copy of that
user (team members, assignees, comment authors, activity actors, ...). The boards the user is viewing
also get a `presence:update` with the new profile, and their later `project:join`s use it.

---

## Permission matrix

| Action                                   | Owner | Admin | Member |
| ---------------------------------------- | :---: | :---: | :----: |
| View team, projects, tasks, activity     |  ✓   |  ✓   |   ✓   |
| Edit team details, add members (as `member`) |  ✓   |  ✓   |   -   |
| Add admins, change member roles, delete team |  ✓   |  -   |   -   |
| Remove members                           |  ✓   | members only | leave only |
| Create / edit / archive / delete project |  ✓   |  ✓   |   -   |
| Create, edit, move tasks; comment        |  ✓   |  ✓   |   ✓   |
| Delete task                              |  ✓   |  ✓   | own tasks |
| Edit comment                             | own  | own  |  own  |
| Delete comment                           |  ✓   |  ✓   |  own  |
