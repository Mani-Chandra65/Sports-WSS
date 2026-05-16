# WebSocL1 Server

**Real-time sports match commentary platform** — A production-ready Node.js server for managing live sports events with real-time WebSocket updates, AI-powered security, and type-safe database operations.

[![Node.js 18+](https://img.shields.io/badge/Node.js-18+-brightgreen)](https://nodejs.org/) 
[![Express.js 5.2](https://img.shields.io/badge/Express.js-5.2.1-90c53f)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791)](https://www.postgresql.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-informational)](https://github.com/websockets/ws)
[![License](https://img.shields.io/badge/License-ISC-blue)](#license)

---

## Overview

WebSocL1 Server enables real-time sports match management and live commentary broadcasting. Connect clients via REST API to create matches, manage commentary, and subscribe to live updates through WebSocket channels.

**Key Features:**
- **Real-time Broadcasting** — WebSocket-based live updates for matches and commentary
- **Enterprise Security** — Arcjet integration with bot detection, rate limiting, and OWASP Top 10 protection
- **Type-Safe Operations** — Drizzle ORM with TypeScript-like validation via Zod
- **High Performance** — Concurrent connection handling with efficient pub/sub model
- **Auto-calculated Status** — Match status (scheduled/live/finished) computed from timestamps

---

## Tech Stack

| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| **Node.js** | 18+ | JavaScript runtime |
| **Express.js** | 5.2.1 | HTTP REST API framework |
| **WebSocket (ws)** | 8.20.1 | Real-time bidirectional communication |
| **PostgreSQL** | Latest | Relational database (Neon Cloud) |
| **Drizzle ORM** | 0.45.2 | Type-safe query builder |
| **Zod** | 4.4.3 | Runtime schema validation |
| **Arcjet** | 1.4.0 | Security & rate limiting |
| **pg (node-postgres)** | 8.20.0 | PostgreSQL client |

---

## Quick Start

### Prerequisites
- **Node.js** 18 or higher
- **npm** or **pnpm** (npm 8+)
- **PostgreSQL** database (or Neon cloud account)

### Installation

```bash
# 1. Clone repository and navigate to server folder
git clone <repo-url>
cd server

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your database URL and Arcjet key

# 4. Run database migrations
npm run db:generate
npm run db:migrate

# 5. Start development server
npm run dev
```

**Expected Output:**
```
Server started on http://localhost:8000
WebSocketServer is running on ws://localhost:8000/ws
```

### Verify Installation

Test the health check endpoint:
```bash
curl http://localhost:8000/
# Response: { "message": "Hello from Express" }
```

---

## API Documentation

### Base URL
```
Development:  http://localhost:8000
WebSocket:    ws://localhost:8000/ws
```

### Request Flow Diagram

#### HTTP Request → Response Flow
```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP POST /matches
       ▼
┌─────────────────────────┐
│  Arcjet Security Check  │
│  - Rate Limiting        │
│  - Bot Detection        │
│  - OWASP Shield         │
└──────┬──────────────────┘
      │ Allowed
       ▼
┌────────────────────────┐
│  Express Middleware    │
│  - JSON Parser         │
│  - Zod Validation      │
└──────┬─────────────────┘
      │ Valid Schema
       ▼
┌────────────────────────┐
│  Route Handler         │
│  - Insert to Database  │
│  - Calculate Status    │
└──────┬─────────────────┘
      │ Success
       ▼
┌────────────────────────┐
│  WebSocket Broadcast   │
│  - Notify subscribers  │
│  - Event: matchCreated │
└──────┬─────────────────┘
       │ JSON Response
       ▼
┌──────────────┐
│   Client     │
│  {data:{...}}│
└──────────────┘
```

### Endpoints

---

### **GET /** — Health Check

Get server status and welcome message.

**Request:**
```bash
curl http://localhost:8000/
```

**Response:** `200 OK`
```json
{
  "message": "Hello from Express"
}
```

---

### **GET /matches** — List Matches

Retrieve all matches with pagination (ordered by creation date, newest first).

**Request:**
```bash
curl "http://localhost:8000/matches?limit=10"
```

**Query Parameters:**
| Parameter | Type | Default | Max | Description |
|:----------|:-----|:--------|:-----|:------------|
| `limit` | number | 50 | 100 | Number of matches to return |

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "sport": "Football",
    "homeTeam": "Manchester United",
    "awayTeam": "Liverpool",
    "status": "live",
    "startTime": "2024-05-20T18:00:00.000Z",
    "endTime": "2024-05-20T20:00:00.000Z",
    "homeScore": 2,
    "awayScore": 1,
    "createdAt": "2024-05-20T14:30:00.000Z"
  }
]
```

**Error Responses:**
```bash
# Invalid query parameters
# 400 Bad Request
{
  "error": "Invalid Query",
  "details": [
    {
      "code": "too_big",
      "maximum": 100,
      "type": "number",
      "path": ["limit"],
      "message": "Number must be less than or equal to 100"
    }
  ]
}
```

---

### **POST /matches** — Create Match

Create a new match event. Status is automatically calculated based on `startTime` and `endTime`.

**Request:**
```bash
curl -X POST http://localhost:8000/matches \
  -H "Content-Type: application/json" \
  -d '{
    "sport": "Cricket",
    "homeTeam": "India",
    "awayTeam": "Australia",
    "startTime": "2024-06-15T10:00:00Z",
    "endTime": "2024-06-15T18:00:00Z",
    "homeScore": 0,
    "awayScore": 0
  }'
```

**Request Body Schema:**
```javascript
{
  sport:      string (required, min 1 char)
  homeTeam:   string (required, min 1 char)
  awayTeam:   string (required, min 1 char)
  startTime:  ISO 8601 UTC string (required) - e.g., "2024-06-15T10:00:00Z"
  endTime:    ISO 8601 UTC string (required) - must be after startTime
  homeScore:  number (optional, default: 0, min: 0)
  awayScore:  number (optional, default: 0, min: 0)
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": 5,
    "sport": "Cricket",
    "homeTeam": "India",
    "awayTeam": "Australia",
    "status": "scheduled",
    "startTime": "2024-06-15T10:00:00.000Z",
    "endTime": "2024-06-15T18:00:00.000Z",
    "homeScore": 0,
    "awayScore": 0,
    "createdAt": "2024-05-20T15:45:00.000Z"
  }
}
```

**Error Responses:**
```bash
# Invalid payload - missing required fields
# 400 Bad Request
{
  "error": "Invalid Payload",
  "details": [
    {
      "code": "invalid_string",
      "validation": "custom",
      "path": ["endTime"],
      "message": "endTime must be after startTime"
    }
  ]
}

# Rate limit exceeded (50 req / 10s)
# 429 Too Many Requests
{
  "error": "Too many requests!"
}

# Security block (bot detected or denied)
# 403 Forbidden
{
  "error": "Forbidden!"
}
```

---

### **GET /matches/:id/commentary** — Get Commentary

Retrieve commentary events for a specific match.

**Request:**
```bash
curl "http://localhost:8000/matches/1/commentary?limit=20"
```

**Path Parameters:**
| Parameter | Type | Description |
|:----------|:-----|:------------|
| `id` | number | Match ID (required) |

**Query Parameters:**
| Parameter | Type | Default | Max | Description |
|:----------|:-----|:--------|:-----|:------------|
| `limit` | number | 100 | 100 | Number of commentary events to return |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 42,
      "matchId": 1,
      "minute": 45,
      "sequence": 3,
      "period": "1H",
      "eventType": "goal",
      "actor": "Harry Kane",
      "team": "Manchester United",
      "message": "GOAL! Kane scores after a brilliant header!",
      "metadata": {
        "assist": "Marcus Rashford",
        "videoUrl": "https://..."
      },
      "tags": ["goal", "header", "set-piece"],
      "createdAt": "2024-05-20T18:15:00.000Z"
    }
  ]
}
```

**Error Responses:**
```bash
# Invalid match ID
# 400 Bad Request
{
  "error": "Invalid Params",
  "details": [...]
}
```

---

### **POST /matches/:id/commentary** — Add Commentary

Add a play-by-play commentary event during a match.

**Request:**
```bash
curl -X POST http://localhost:8000/matches/1/commentary \
  -H "Content-Type: application/json" \
  -d '{
    "minute": 23,
    "sequence": 5,
    "period": "1H",
    "eventType": "goal",
    "actor": "Cristiano Ronaldo",
    "team": "Manchester United",
    "message": "GOAL! Ronaldo with a powerful strike from outside the box!",
    "metadata": {
      "assist": "Bruno Fernandes",
      "shotType": "left-foot",
      "distance": "22 yards"
    },
    "tags": ["goal", "striker", "powershot"]
  }'
```

**Request Body Schema:**
```javascript
{
  minute:    number (required, min: 0)
  sequence:  number (required, min: 0) - event order within minute
  period:    string (required, min 1 char) - e.g., "1H", "2H", "ET"
  eventType: string (required, min 1 char) - e.g., "goal", "yellow_card", "substitution"
  actor:     string (required, min 1 char) - player/official name
  team:      string (required, min 1 char) - team name
  message:   string (required, min 1 char) - commentary description
  metadata:  object (optional, default: {}) - flexible event-specific data
  tags:      string[] (optional, default: []) - event categorization
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": 43,
    "matchId": 1,
    "minute": 23,
    "sequence": 5,
    "period": "1H",
    "eventType": "goal",
    "actor": "Cristiano Ronaldo",
    "team": "Manchester United",
    "message": "GOAL! Ronaldo with a powerful strike from outside the box!",
    "metadata": {
      "assist": "Bruno Fernandes",
      "shotType": "left-foot",
      "distance": "22 yards"
    },
    "tags": ["goal", "striker", "powershot"],
    "createdAt": "2024-05-20T18:23:00.000Z"
  }
}
```

---

## Database Schema

### Connection
The server connects to PostgreSQL using **Neon Cloud** (serverless PostgreSQL).

### Tables

#### `matches` Table
Stores sports match events with auto-calculated status.

| Column | Type | Notes |
|:-------|:-----|:------|
| `id` | SERIAL | Primary key |
| `sport` | TEXT | Sport type (Football, Cricket, etc.) |
| `homeTeam` | TEXT | Home team name |
| `awayTeam` | TEXT | Away team name |
| `status` | ENUM | `'scheduled'` \| `'live'` \| `'finished'` — auto-calculated |
| `startTime` | TIMESTAMPTZ | Match start (UTC) |
| `endTime` | TIMESTAMPTZ | Match end (UTC) |
| `homeScore` | INTEGER | Current score for home team |
| `awayScore` | INTEGER | Current score for away team |
| `createdAt` | TIMESTAMPTZ | Record creation timestamp |

**Status Calculation:**
```
NOW() < startTime          → 'scheduled'
startTime ≤ NOW() < endTime → 'live'
NOW() ≥ endTime            → 'finished'
```

---

#### `commentary` Table
Stores play-by-play events during matches.

| Column | Type | Notes |
|:-------|:-----|:------|
| `id` | SERIAL | Primary key |
| `matchId` | INTEGER | Foreign key → `matches(id)`, CASCADE delete |
| `minute` | INTEGER | Match minute when event occurred |
| `sequence` | INTEGER | Event order within the minute |
| `period` | TEXT | Game period/half (e.g., "1H", "2H", "ET") |
| `eventType` | TEXT | Event category (e.g., "goal", "yellow_card") |
| `actor` | TEXT | Player/official involved |
| `team` | TEXT | Team name |
| `message` | TEXT | Commentary description |
| `metadata` | JSONB | Flexible event-specific data (assist, distance, etc.) |
| `tags` | TEXT[] | Event categorization array |
| `createdAt` | TIMESTAMPTZ | Event creation timestamp |

### Run Migrations

```bash
# Generate migration from schema
npm run db:generate

# Apply migrations to database
npm run db:migrate
```

---

## Configuration

### Environment Variables

Create a `.env` file in the server root:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Server
PORT=8000
HOST=0.0.0.0

# Arcjet Security
ARCJET_KEY="ajkey_xxxxxxxxxxxxx"
ARCJET_MODE="LIVE"  # or "DRY_RUN" for testing
```

### Environment Variable Reference

| Variable | Type | Required | Example |
|:---------|:-----|:---------|:--------|
| `DATABASE_URL` | string |  Yes | `postgresql://...` |
| `PORT` | number |  No | `8000` (default) |
| `HOST` | string |  No | `0.0.0.0` (default) |
| `ARCJET_KEY` | string |  Yes | `ajkey_...` |
| `ARCJET_MODE` | string |  No | `LIVE` (default) or `DRY_RUN` |

### Security Configuration

**Arcjet Rules** (see `src/routes/arcjet.js`):

| Layer | Rule | HTTP Limit | WS Limit | Allowed |
|:------|:-----|:-----------|:---------|:--------|
| **Bot Detection** | detectBot | — | — | Search engines, preview crawlers |
| **Rate Limiting** | slidingWindow | 50 req / 10s | 5 msg / 2s | Arcjet sliding window |
| **Protection** | shield | OWASP Top 10 | OWASP Top 10 | All except bot traffic |

**Modes:**
- `LIVE` — Production mode, blocks violating requests
- `DRY_RUN` — Testing mode, logs violations without blocking

---

## Real-World Examples

This section describes the production workflow at a high level (theory only).

- Match lifecycle: Matches are created via the REST API and stored in the database; the server computes and persists the `status` (scheduled/live/finished) from the provided timestamps.
- Client interaction: Consumers (web or mobile clients) subscribe to match-specific updates over the WebSocket endpoint. Subscriptions are limited per-socket and the server maintains heartbeat pings to detect stale connections.
- Commentary & events: Play-by-play events are validated on receipt, persisted in the `commentary` table, and then published to all subscribed clients as JSON messages (containing a `type` field and the event payload).
- Broadcasting model: The server performs in-memory pub/sub by match id; for horizontal scaling, a centralized message broker (Redis, NATS) or a managed pub/sub layer is recommended so multiple server instances can share events.
- Security & reliability: Arcjet enforces rate limits and bot detection before requests reach application logic; the application performs input validation and graceful error handling. Database referential integrity and cascade deletes keep data consistent.
- Observability & ops: Production should include structured logging, request metrics, WebSocket connection metrics, and health checks; use migrations for schema changes and a CI step to validate migrations before deploy.

The above captures what the production system does; implementation details and code examples are intentionally omitted in this section.

## Security Best Practices

### Rate Limiting

- **HTTP:** 50 requests per 10 seconds
- **WebSocket:** 5 messages per 2 seconds

If you exceed limits:
```json
{
  "error": "Too many requests!"
}
```

### Bot Protection

Arcjet automatically allows:
- Search engine crawlers (Google, Bing)
- Preview crawlers (Discord, Twitter unfurl)
- Tools (Postman for testing)

Other bots are blocked unless configured.

### OWASP Top 10 Protection

Arcjet Shield enables automatic protection against:
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- And more...

---

## NPM Scripts

| Script | Command | Purpose |
|:-------|:--------|:--------|
| `start` | `node src/index.js` | Run production server |
| `dev` | `node --watch src/index.js` | Run with auto-reload |
| `db:generate` | `drizzle-kit generate` | Generate migrations from schema |
| `db:migrate` | `drizzle-kit migrate` | Apply migrations to database |
| `test` | — | (Not configured yet) |

---

## Contributing

### Guidelines

1. **Fork** the repository
2. **Create feature branch:** `git checkout -b 
Feature/your-feature`
3. **Follow code style:**
   - Use ES modules (`import`/`export`)
   - Validate inputs with Zod schemas
   - Add error handling for async operations
   - Comment complex logic
4. **Test locally** before submitting PR
5. **Submit pull request** with description


## References & Documentation

### Tools & Libraries

| Tool | Documentation |
|:-----|:--------------|
| Express.js | [expressjs.com](https://expressjs.com) |
| WebSocket (ws) | [github.com/websockets/ws](https://github.com/websockets/ws) |
| Drizzle ORM | [orm.drizzle.team](https://orm.drizzle.team) |
| Zod | [zod.dev](https://zod.dev) |
| Arcjet | [arcjet.io](https://arcjet.io) |
| PostgreSQL | [postgresql.org](https://www.postgresql.org) |
| Neon Cloud | [neon.tech](https://neon.tech) |

### Related Resources

- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [Real-time Communication with WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [SQL Basics](https://www.postgresql.org/docs/current/sql-syntax.html)
- [API Design Best Practices](https://restfulapi.net/)

---

## License

ISC License — See [LICENSE](../LICENSE) file for details.

---

## Support & Issues

**Found a bug?** Open an issue with:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version)

**Have a question?** Check existing issues or create a new discussion.

---

**Built for real-time sports commentary**
