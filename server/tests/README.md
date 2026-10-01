# TaskFlow server tests

Integration tests drive the real Express app over HTTP (Supertest) and the real Socket.IO server
(socket.io-client) against a real MongoDB. A few pure unit tests live in `unit/`.

## Running

```bash
# From the repository root (or `npm test -w server`)
npm test

# Against an existing MongoDB server, e.g. the one from docker compose
MONGO_TEST_URI=mongodb://127.0.0.1:27017 npm test

# A single file, or watch mode
npm test -w server -- tests/realtime.test.js
npm run test:watch -w server
```

### Which database is used

- **`MONGO_TEST_URI` set** (local Docker, CI service container): the tests use that server. It is a
  server URI; any database name in it is ignored.
- **Not set**: `globalSetup.js` starts one in-memory MongoDB (`mongodb-memory-server`) for the run.
  The binary is downloaded on first use.

Either way, every test file gets its own database named `taskflow_test_<random>`, which is dropped
when the file finishes. Your development data (`taskflow`) is never touched.

## Layout

| File                             | Covers                                                           |
| -------------------------------- | ---------------------------------------------------------------- |
| `globalSetup.js`                 | in-memory MongoDB when `MONGO_TEST_URI` is not set               |
| `setup.js`                       | per-file database, index creation, cleanup; cheaper bcrypt cost  |
| `helpers.js`                     | Supertest client, factories, explicit waits, socket helpers      |
| `auth.test.js`                   | register, login, `/auth/me`, tokens, password change, revocation |
| `users.test.js`                  | user search for adding team members (teammates / exact email)    |
| `teams.test.js`                  | teams, roles, membership rules, cascades                         |
| `projects.test.js`               | projects, keys, filters, archiving, recent activity, cascades    |
| `tasks.test.js`                  | task CRUD, numbering, validation, side effects, permissions      |
| `ordering.test.js`               | drag & drop (`/move`), fractional positions, re-balancing, stale neighbours |
| `search.test.js`                 | `GET /tasks` filters, archived projects, timezones, sorting      |
| `comments.test.js`               | comments, counters, permissions                                  |
| `notifications-activity.test.js` | notifications, activity log, cursor pagination, due reminders    |
| `dashboard.test.js`              | dashboard statistics and their agreement with `GET /tasks`       |
| `realtime.test.js`               | socket auth, rooms, presence, heartbeat, join/leave races, pushed events, profile edits |
| `errors.test.js`                 | health, 4xx/500 envelopes, CORS, proxy trust, security headers   |
| `unit/*.test.js`                 | date ranges, the validation middleware, environment parsing      |

## Conventions

- Use the factories in `helpers.js` (`registerUser`, `createWorkspace`, `createTask`, ...) to build
  data through the public API; touch models directly only to craft states the API cannot produce.
- Files that need a clean slate call `resetDatabase()` in `beforeEach`; read-only suites (e.g.
  search) build one dataset in `beforeAll`.
- Never sleep. Register `waitForEvent()` **before** triggering the action, poll with `waitUntil()`,
  and prove that an event was _not_ delivered with `collectEvents()` (it flushes the socket with an
  acknowledged round trip, relying on Socket.IO's in-order delivery); `collectEventsFrom()` does the
  same for several sockets at once, e.g. to check who received an event and how many times.
- bcrypt runs with 4 rounds instead of 10 in tests (still real hashes); see `setup.js`.
