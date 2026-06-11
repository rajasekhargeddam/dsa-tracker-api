<div align="center">

# 🧠 DSA Tracker — Backend API

**A multi-user REST API for tracking LeetCode practice with spaced-repetition revisions.**

Built with Node.js, Express & MongoDB · Secured with JWT + bcrypt

![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-8.x-880000?logo=mongoose&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-FB015B?logo=jsonwebtokens&logoColor=white)

</div>

> The React client lives in [`../frontendTracker`](../frontendTracker).
> Project-wide notes live in [`../ISSUES.md`](../ISSUES.md) · learning roadmap in [`../LEARNING.md`](../LEARNING.md).

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [NPM Scripts](#-npm-scripts)
- [Data Models](#-data-models)
- [Spaced-Repetition Engine](#-spaced-repetition-engine)
- [API Reference](#-api-reference)
- [Authentication & Authorization](#-authentication--authorization)
- [Error Handling](#-error-handling)
- [Security](#-security)
- [Seeding the Catalog](#-seeding-the-catalog)
- [Deployment](#-deployment)

---

## 🚀 Overview

DSA Tracker helps you (and your friends) master Data Structures & Algorithms by combining a **shared problem catalog** with a **personal spaced-repetition schedule**. You browse a global LeetCode catalog, add problems you're tracking, and our engine automatically schedules revisions at optimal intervals.

**Core capabilities**

- 🔐 JWT authentication with **invite-code-gated** registration (keeps the app private)
- 👥 Full **multi-user data isolation** — every record is scoped to its owner
- 📚 A **global, deduplicated** problem catalog (each LeetCode problem stored once)
- 📝 Personal tracking — notes, solved state, and per-user progress
- 🔁 Automatic **spaced-repetition** revision scheduling with lazy, clock-driven unlocking
- 📊 A one-call **dashboard** aggregation (stats + due/upcoming revisions + recent activity)
- 🛡️ Production hardening — Helmet, CORS allow-listing, body-size caps, auth rate limiting

---

## 🏛 Architecture

The defining design decision: **problem metadata is global; progress is personal.**

```
                ┌──────────────────────┐
                │   ProblemCatalog     │   ← one document per LeetCode problem
                │  (global, shared)    │      "Two Sum" exists exactly once
                └──────────┬───────────┘
                           │ referenced by
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐
     │ UserProblem│ │ UserProblem│ │ UserProblem│   ← User A / B / C each track it
     │  (User A)  │ │  (User B)  │ │  (User C)  │      with their own notes & status
     └──────┬─────┘ └────────────┘ └────────────┘
            │ has many
     ┌──────▼─────┐
     │  Revision  │   ← 3 spaced-repetition stages per tracked problem
     │  (1, 2, 3) │
     └────────────┘
```

This avoids duplicating problem text across users and lets the catalog be curated centrally (via a seed file) while each user's tracker stays lightweight.

**Request flow (layered):**

```
HTTP request
   │
   ▼
routes/        →  declare endpoints, attach to controllers
   │
   ▼
middleware/    →  protect (JWT), asyncHandler, errorHandler
   │
   ▼
controllers/   →  parse req / shape res (thin)
   │
   ▼
services/      →  business logic & DB queries (the "brains")
   │
   ▼
models/        →  Mongoose schemas + validation
   │
   ▼
MongoDB
```

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | **Node.js 18+** | JavaScript on the server |
| Framework | **Express 4** | Minimal, battle-tested HTTP routing |
| Database | **MongoDB** (Atlas) | Flexible document store |
| ODM | **Mongoose 8** | Schemas, validation, query building |
| Auth | **jsonwebtoken** | Stateless JWT access tokens |
| Passwords | **bcryptjs** | Salted password hashing |
| Security | **helmet** | Secure HTTP headers |
| Rate limit | **express-rate-limit** | Brute-force protection on auth |
| CORS | **cors** | Cross-origin access control |
| Config | **dotenv** | Environment variable loading |
| Dev | **nodemon** | Auto-restart on file changes |

---

## 📂 Project Structure

```
backendTracker/
├── data/
│   └── problems.json            # Catalog seed data (100 LeetCode problems)
├── scripts/
│   ├── importCatalog.js         # Idempotent catalog seeder  → npm run seed:catalog
│   └── syncIndexes.js           # Reconcile DB indexes       → npm run sync:indexes
├── src/
│   ├── app.js                   # Express app: middleware, routes, error handler
│   ├── server.js                # Entry point: env, DB connect, listen
│   ├── config/
│   │   └── db.js                # MongoDB connection
│   ├── controllers/             # Thin HTTP layer
│   │   ├── authController.js
│   │   ├── catalogController.js
│   │   ├── userProblemController.js
│   │   ├── revisionController.js
│   │   └── dashboardController.js
│   ├── services/                # Business logic & DB queries
│   │   ├── authService.js
│   │   ├── catalogService.js
│   │   ├── userProblemService.js
│   │   ├── revisionService.js
│   │   └── dashboardService.js
│   ├── models/                  # Mongoose schemas
│   │   ├── User.js
│   │   ├── ProblemCatalog.js
│   │   ├── UserProblem.js
│   │   └── Revision.js
│   ├── routes/                  # Express routers (one per domain)
│   ├── middleware/
│   │   ├── auth.js              # protect — verifies JWT, sets req.userId
│   │   ├── asyncHandler.js      # wraps async controllers, forwards errors
│   │   └── errorHandler.js      # central error → JSON translator
│   └── utils/
│       ├── jwt.js              # signToken / verifyToken
│       ├── AppError.js         # operational error class
│       ├── dateUtils.js        # UTC day boundaries & addDays
│       └── queryUtils.js       # regex escaping for safe search
├── .env / .env.example
└── package.json
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js 18+**
- A **MongoDB** database — [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier) or local `mongod`

### Installation

```bash
cd backendTracker

# 1. Install dependencies
npm install

# 2. Create your environment file from the template
cp .env.example .env
#    → open .env and fill in MONGO_URI, JWT_SECRET, INVITE_CODE

# 3. Seed the global problem catalog (safe to re-run)
npm run seed:catalog

# 4. Reconcile database indexes (run once on a fresh/migrated DB)
npm run sync:indexes

# 5. Start the dev server (auto-reload)
npm run dev
```

You should see:

```
MongoDB Connected: <host>
Server running on port 5000
```

**Verify it's alive:**

```bash
curl http://localhost:5000/api/health
# → { "success": true, "message": "DSA Tracker API is running" }
```

---

## 🔑 Environment Variables

Defined in `.env` (never commit this — it's git-ignored). See `.env.example` for a template.

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `MONGO_URI` | ✅ | — | MongoDB connection string |
| `PORT` | — | `5000` | Port the server listens on |
| `CORS_ORIGIN` | — | `*` | Comma-separated allowed origins. **Set in production** (e.g. your frontend URL) |
| `JWT_SECRET` | ✅ | — | Secret for signing JWTs. **Use a long, random string.** |
| `JWT_EXPIRES_IN` | — | `7d` | Token lifetime |
| `BCRYPT_SALT_ROUNDS` | — | `10` | bcrypt cost factor |
| `INVITE_CODE` | ✅ | — | Shared secret required to register. Share privately with friends. |
| `NODE_ENV` | — | — | Set to `development` to include error stack traces in responses |

> ⚠️ Rotate `JWT_SECRET` and `INVITE_CODE` to your own private values before deploying, and keep your real `MONGO_URI` out of version control.

---

## 📜 NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `nodemon src/server.js` | Start with auto-reload (development) |
| `npm start` | `node src/server.js` | Start in production mode |
| `npm run seed:catalog` | `node scripts/importCatalog.js` | Import/refresh the catalog from `data/problems.json` (idempotent upsert) |
| `npm run sync:indexes` | `node scripts/syncIndexes.js` | Drop stale indexes, build current ones, clean dead legacy revisions |

---

## 🗃 Data Models

### `User`
| Field | Type | Notes |
|-------|------|-------|
| `name` | String | required, ≤ 60 chars |
| `email` | String | required, **unique**, lowercased, validated |
| `password` | String | required, ≥ 6 chars, **bcrypt-hashed**, never returned |
| `age` | Number | optional, 10–120 |
| `about` | String | optional, ≤ 500 chars |
| `role` | Enum | `Student` \| `Working Professional` \| `Other` |
| `organization` | String | optional, ≤ 100 chars |
| `createdAt` / `updatedAt` | Date | auto timestamps |

### `ProblemCatalog` — *global, shared*
| Field | Type | Notes |
|-------|------|-------|
| `problemNumber` | Number | required, **unique**, positive integer |
| `title` | String | required, **text-indexed** for search |
| `difficulty` | Enum | `Easy` \| `Medium` \| `Hard` |
| `tags` | [String] | e.g. `["Array", "Hash Table"]` |
| `slug` | String | URL slug, e.g. `two-sum` |
| `leetcodeUrl` | String | link to the problem on LeetCode |

### `UserProblem` — *per-user tracking record*
| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | required, indexed |
| `problemId` | ObjectId → ProblemCatalog | required |
| `notes` | String | personal notes |
| `isSolved` | Boolean | default `false` |
| `solvedDate` | Date | set when solved |

> **Unique index** on `{ userId, problemId }` — a user can track any given problem only once.

### `Revision` — *spaced-repetition stage*
| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | required, indexed |
| `userProblemId` | ObjectId → UserProblem | required |
| `revisionLevel` | Number | `1` \| `2` \| `3` |
| `dueDate` | Date | when the stage becomes due |
| `completedDate` | Date | when it was completed |
| `status` | Enum | `LOCKED` \| `PENDING` \| `COMPLETED` |

> **Unique index** on `{ userId, userProblemId, revisionLevel }`.

---

## 🔁 Spaced-Repetition Engine

When a tracked problem is marked solved, three revision stages are created — all starting `LOCKED`:

| Stage | Due date set to | Unlocks (→ `PENDING`) when… |
|:-----:|-----------------|------------------------------|
| **Revision 1** | `solvedDate + 3 days` | its due date arrives |
| **Revision 2** | `(R1 completion) + 7 days` | R1 is completed **and** its due date arrives |
| **Revision 3** | `(R2 completion) + 20 days` | R2 is completed **and** its due date arrives |

**Lazy, clock-driven status sync** — instead of a cron job, `syncRevisionStatuses()` runs at the start of every revision read and reconciles statuses against "now":

- `LOCKED` + due today or earlier → `PENDING` (unlocked)
- `PENDING` + due in the future → `LOCKED` (self-heals early-unlocked rows)

So a `PENDING` revision **always means "completable right now."** Completing one is rejected if it isn't due yet or the previous stage is incomplete.

---

## 🌐 API Reference

**Base URL:** `http://localhost:5000/api`

**Response envelope:**
```jsonc
// Success
{ "success": true, "data": { /* ... */ } }
// Error
{ "success": false, "message": "Human-readable error" }
```

### 🔐 Auth — `/api/auth`
| Method | Endpoint | Auth | Body / Notes |
|:------:|----------|:----:|--------------|
| `POST` | `/register` | — | `{ name, email, password, inviteCode, age?, about?, role?, organization? }` → `{ user, token }` |
| `POST` | `/login` | — | `{ email, password }` → `{ user, token }` |
| `GET` | `/me` | ✅ | Current user's profile |
| `PATCH` | `/me` | ✅ | Update `name` / `age` / `about` / `role` / `organization` (email & password are not editable here) |

### 📚 Catalog — `/api/catalog` *(auth required)*
| Method | Endpoint | Notes |
|:------:|----------|-------|
| `GET` | `/` | Browse the catalog. Query: `search`, `difficulty`, `tag`, `page`, `limit`, `sort` |
| `GET` | `/tags` | Distinct list of all catalog tags |
| `GET` | `/:id` | A single catalog problem |

**`GET /catalog` query params:** `search` (matches title **or** problem number) · `difficulty` (`Easy`/`Medium`/`Hard`) · `tag` · `page` (default 1) · `limit` (default 20, max 100) · `sort` (by `number` or `difficulty`).
Returns a paginated payload: `{ data, total, page, limit, totalPages }`.

### 📝 My Problems — `/api/my-problems` *(auth required)*
| Method | Endpoint | Notes |
|:------:|----------|-------|
| `POST` | `/` | `{ problemId }` — add a catalog problem to the tracker (**409** if already tracked) |
| `GET` | `/` | The user's tracked problems (with catalog metadata + revision progress joined). Query: `search`, `difficulty`, `status`, `tag`, `sort` |
| `GET` | `/:id` | A tracked problem + catalog details + its revisions |
| `PATCH` | `/:id/notes` | `{ notes }` — update notes |
| `PATCH` | `/:id/solve` | Mark solved → creates the 3 revision stages |
| `DELETE` | `/:id` | Remove from tracker (**cascades** to delete its revisions) |

### 🔁 Revisions — `/api/revisions` *(auth required)*
| Method | Endpoint | Notes |
|:------:|----------|-------|
| `GET` | `/` | List revisions. Query: `status` (`PENDING`/`COMPLETED`/`LOCKED`), `revisionLevel` (1–3) |
| `PATCH` | `/:id/complete` | Complete a revision, schedule + unlock the next stage |

### 📊 Dashboard — `/api/dashboard` *(auth required)*
| Method | Endpoint | Notes |
|:------:|----------|-------|
| `GET` | `/` | Returns `{ stats, todayRevisions, upcomingRevisions, recentProblems }` in one call |

---

## 🔒 Authentication & Authorization

1. `POST /api/auth/register` (with a valid `inviteCode`) or `POST /api/auth/login` returns a **JWT**.
2. Send it on every protected request:
   ```
   Authorization: Bearer <token>
   ```
3. The `protect` middleware verifies the token and attaches **`req.userId`**, which every service uses to scope data to the owner — guaranteeing users can only read/modify their own records.

A missing / invalid / expired token returns **401** with a clear message (the frontend uses this to redirect to login).

---

## ❗ Error Handling

- Controllers are wrapped in **`asyncHandler`**, so thrown errors are forwarded to a single central handler.
- **`AppError(message, statusCode)`** represents expected/operational errors (validation, not-found, auth).
- The error handler translates common failures into friendly messages:
  - Mongoose `ValidationError` → **400** with field messages
  - Duplicate key (`11000`) → **400/409** (e.g. "An account with this email already exists.")
  - `JsonWebTokenError` / `TokenExpiredError` → **401**
  - `CastError` (bad ObjectId) → **400**
- Unknown routes return **404**: `Route not found: <url>`.
- Stack traces are included **only** when `NODE_ENV=development`.

---

## 🛡 Security

- **Passwords** hashed with bcrypt (`pre('save')` hook); never returned in any response.
- **JWT** secret & expiry are environment-configurable.
- **Helmet** sets secure HTTP headers.
- **CORS** restrictable to known origins via `CORS_ORIGIN`.
- **Body size** capped at `1 MB`.
- **Rate limiting** on `/api/auth` (30 requests / 15 min / IP).
- **Invite code** gates registration so only invited people can create accounts.

> See [`../ISSUES.md`](../ISSUES.md) for known hardening items (e.g. scoping the rate limiter to login/register only, and moving tokens off `localStorage`).

---

## 🌱 Seeding the Catalog

The global catalog is populated from **`data/problems.json`** via an idempotent importer. To add or update problems, see the dedicated guide in [`../ISSUES.md`](../ISSUES.md).

Quick version:

```bash
# After editing data/problems.json:
npm run seed:catalog
```

The importer upserts by `problemNumber`, so existing problems are updated and new ones inserted — **running it repeatedly is safe**.

---

## 🚢 Deployment

1. Provision a MongoDB database (Atlas recommended) and copy its connection string.
2. Set all required environment variables on your host (`MONGO_URI`, `JWT_SECRET`, `INVITE_CODE`, and `CORS_ORIGIN` = your deployed frontend URL).
3. From a one-time setup shell: `npm install && npm run seed:catalog && npm run sync:indexes`.
4. Start with `npm start` (or a process manager such as **PM2**).
5. Point the frontend's `VITE_API_URL` at this server's `/api` base.

**Suggested hosts:** Render, Railway, Fly.io, or any Node-capable VPS.
