# StellarStay Hotels

[![Test Coverage](https://img.shields.io/badge/coverage-49%25-yellow)](https://github.com/rubbini-en/stellarstay-hotels) [![Tests](https://img.shields.io/badge/tests-13%20passed-brightgreen)](https://github.com/rubbini-en/stellarstay-hotels)

Production-style slice for the assessment using Hexagonal Architecture and Option B endpoints.

## Overview
StellarStay Hotels is a scalable reservation management system designed to handle 50,000+ daily bookings. This implementation showcases hexagonal architecture, dynamic pricing with business rules, idempotent operations, and reliability patterns including exponential backoff retry.

**Key Features:**
- Dynamic pricing (base rates, weekend surcharge, length discounts, breakfast)
- Idempotent reservation creation (idempotency-key)
- Exponential backoff retry for outbound calls
- Availability conflict detection (409)
- Request correlation tracking (X-Correlation-Id)

## Quick Start

```bash
# Clone and enter
cd stellarstay-hotels
npm ci

# Run unit + API tests
npm test

# Run tests with coverage report
npm run test:coverage

# Coverage breakdown:
# - Domain logic (pricing): 93% coverage
# - API routes: 71% coverage  
# - Cache adapters: 96% coverage
# - Overall: 49% (includes untested adapters like Prisma, AI client)

# Start API (in-memory repo by default)
npm run dev
# Health
curl http://localhost:8000/health
```

## API

- POST `/api/reservations`
```bash
curl -s -X POST http://localhost:8000/api/reservations \
  -H 'Content-Type: application/json' \
  -H 'idempotency-key: key-1' \
  -d '{
    "roomType":"junior",
    "checkIn":"2024-01-16",
    "checkOut":"2024-01-18",
    "numGuests":2,
    "includeBreakfast":true
  }' | jq .
```

- GET `/api/reservations/{id}`
```bash
curl -s http://localhost:8000/api/reservations/<id> | jq .
```

### Error taxonomy

- 400 BAD_REQUEST: validation failures (schema violations, invalid date ranges)
- 404 NOT_FOUND: reservation id not found
- 409 CONFLICT: overlapping reservation for roomType and given range
- 5xx: unexpected server errors

Response shape:
```json
{ "code": "BAD_REQUEST|NOT_FOUND|CONFLICT", "message": "...", "details": { } }
```

## AI-Powered Room Search (BONUS)

Natural language query parsing using Ollama for intelligent room recommendations.

### Setup
```bash
# Install Ollama and pull model
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2:3b
ollama serve

# AI endpoint will be available at POST /api/ai/query
```

### Usage
```bash
curl -s -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "I need a king suite for 2 guests under $300 per night from Jan 15-17"}' | jq .
```

### Response
```json
{
  "query": "I need a king suite for 2 guests under $300 per night",
  "intent": {
    "roomType": "king",
    "maxPriceDollars": 300,
    "numGuests": 2,
    "checkIn": null,
    "checkOut": null
  },
  "recommendations": [
    {
      "type": "king",
      "basePriceDollars": 250,
      "description": "Spacious suite with king bed and premium amenities",
      "available": true,
      "features": ["King bed", "Living area", "Premium amenities", "Room service"]
    }
  ],
  "timestamp": "2025-10-08T17:21:32.673Z"
}
```

**Note**: The AI endpoint requires Ollama to be running with the `llama3.2:1b` model. If Ollama is not available or times out, the endpoint returns a `500 AI_SERVICE_ERROR` with graceful degradation.

**Implementation**: `src/adapters/ai/ollama/client.js` with circuit breaker protection.

### Setup for AI Endpoint
```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the required model
ollama pull llama3.2:1b

# Start Ollama server
ollama serve
```

The AI endpoint will work without Ollama but will return error responses. With Ollama running, it provides intelligent room recommendations based on natural language queries.

**Troubleshooting AI Endpoint:**
- **500 AI_SERVICE_ERROR**: Ensure Ollama is running (`ollama serve`)
- **Timeout errors**: Verify model is pulled (`ollama list` should show `llama3.2:1b`)
- **Circuit breaker open**: Check logs for "Circuit breaker is OPEN" messages
- **Connection refused**: Verify Ollama is accessible at `http://localhost:11434`

## Modes

- In-memory repo (default): fastest for local dev and tests; no external deps.
- Prisma/Postgres repo (optional): realistic persistence path.

Enable Prisma mode:
```bash
# Requires Docker Desktop running
docker-compose up -d postgres redis
cp .env.example .env
npx prisma migrate deploy
# Note: The overlap constraint migration requires PostgreSQL 9.2+ with btree_gist extension
npm run seed
USE_PRISMA=1 npm run dev
```

## Caching

- Cache-aside for GET `/api/reservations/{id}` using Redis with a 5‑minute TTL.
- On successful POST create, cache for that reservation id is invalidated.
- Cache failures are non-fatal (best-effort).

## Reliability

### Idempotency
- **Implementation**: `idempotency-key` header on POST requests
- **Storage**: Unique constraint in database (`idempotencyKey` field)
- **Race handling**: Catches Prisma P2002 error and returns existing reservation
- **Code**: `src/api/routes.js:47-68`

### Retry Policy with Exponential Backoff
- **Strategy**: Exponential backoff with jitter
- **Configuration**: 3 retries, 200ms base delay, 100ms jitter
- **Applied to**: Prisma repository operations
- **Implementation**: `src/domain/retry.js`
- **Example**: `await withRetry(() => prisma.reservation.create({...}), { retries: 3, baseDelayMs: 200, jitterMs: 100 })`

### Circuit Breakers
Prevents cascade failures by failing fast when downstream services are unhealthy.

**Configuration:**
```javascript
// src/infrastructure/circuitBreaker.js
Prisma:       threshold=3 failures, timeout=5s, reset=30s
Redis:        threshold=5 failures, timeout=2s, reset=15s  
External API: threshold=3 failures, timeout=10s, reset=60s
States: CLOSED (normal) → OPEN (failing fast) → HALF_OPEN (testing recovery)
```

### Explicit Timeouts
```javascript
// src/server.js
Request:      8000ms  (requestTimeout in Fastify)
// src/adapters/db/prisma/client.js  
Database:     3000ms  (connect_timeout, pool_timeout, socket_timeout)
// src/adapters/cache/redis/redisClient.js
Redis:        500ms   (connectTimeout, commandTimeout)
// src/adapters/ai/ollama/client.js
External API: 5000ms  (axios timeout)
```

### Concurrency Safety
Double-booking prevention:
- **Database constraint**: PostgreSQL exclusion constraint on (roomType, tsrange(checkIn, checkOut))
- **Migration**: `prisma/migrations/20241008_add_overlap_constraint/migration.sql`
- **Application check**: `repo.hasOverlap()` before reservation creation
- **Idempotency**: Unique constraint on `idempotencyKey` prevents duplicate submissions

### Observability
- **Logger**: Pino structured logging (`src/server.js:5`)
- **Correlation IDs**: `X-Correlation-Id` header echoed and logged in all requests (`src/api/correlation.js`)
- **Health endpoint**: `GET /health` returns `{"status": "ok"}`
- **Log fields**: `correlationId`, `roomType`, `overlap`, `repoType`, `errors`

## Design Decisions & Trade-offs

- Simplifications for assessment scope:
  - Room availability check is in-memory; production would need distributed locking/DB-level constraints per physical room.
  - Payment gateway is mocked; real integration would include circuit breaker and idempotent payment tokens.
  - Single service slice; additional services (notifications, search) omitted for focus.
- Retry Policy:
  - Max 3 retries with exponential backoff (base 200ms) + jitter (100ms).
  - Applied to: database repository; easy to extend to Redis/payment clients.

## Test Coverage

```bash
npm test
# Example output
# Test Files  3 passed (3)
# Tests      13 passed (13)
```

## Quick Validation

1) Health:
```bash
curl http://localhost:8000/health
```
2) Create reservation:
```bash
curl -s -X POST http://localhost:8000/api/reservations \
  -H 'Content-Type: application/json' -H 'idempotency-key: demo-1' \
  -d '{"roomType":"junior","checkIn":"2024-01-16","checkOut":"2024-01-18","numGuests":2,"includeBreakfast":false}' | jq .
```
3) Retrieve reservation:
```bash
curl -s http://localhost:8000/api/reservations/<id> | jq .
```
4) Idempotency:
```bash
# Re-run step 2 with the same idempotency key; expect 200/same ID
```

## Performance Considerations

- Stateless API enables horizontal scaling.
- Redis ready for read caching; TTL-based invalidation.
- Postgres path tested via Prisma; enable connection pooling and proper indexes in production.

## Troubleshooting

- Port conflicts: stop other processes on 5432/6379/8000.
- Postgres not reachable: ensure Docker is running, `.env` has correct `DATABASE_URL`, run `npx prisma migrate deploy`.
- Prisma client: re-generate via `npx prisma generate` after schema changes.

## Documentation

- Architecture RFC: `docs/RFC-001-Architecture.md` (includes reliability details and diagram).
- OpenAPI Specification: `openapi.yml` (complete API documentation with request/response schemas).
- Pricing rules covered and tested (base, length discount, weekend +25%, breakfast per guest/day).
