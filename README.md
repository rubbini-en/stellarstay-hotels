# StellarStay Hotels

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

- POST `/api/ai/query` (AI-powered room search - BONUS)
```bash
curl -s -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "I need a king suite for 2 guests under $300 per night from Jan 15-17"}' | jq .
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

## Modes

- In-memory repo (default): fastest for local dev and tests; no external deps.
- Prisma/Postgres repo (optional): realistic persistence path.

Enable Prisma mode:
```bash
# Requires Docker Desktop running
docker-compose up -d postgres redis
cp .env.example .env
npx prisma migrate deploy
npm run seed
USE_PRISMA=1 npm run dev
```

Enable AI endpoint (BONUS):
```bash
# Install Ollama and pull model
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2:3b
ollama serve

# AI endpoint will be available at POST /api/ai/query
```

## Caching

- Cache-aside for GET `/api/reservations/{id}` using Redis with a 5‑minute TTL.
- On successful POST create, cache for that reservation id is invalidated.
- Cache failures are non-fatal (best-effort).

## Reliability

- **Idempotency on POST** via `idempotency-key` header (safe retries return prior result with race condition handling).
- **Retry/backoff** (exponential + jitter, 3 attempts) for Prisma repository calls.
- **Circuit breakers** for Prisma (3 failures, 30s reset) and Redis (5 failures, 15s reset).
- **Explicit timeouts**: Request 8s, DB 3s, Redis 500ms, External APIs 5s.
- **DB-level conflict safety** with exclusion constraints preventing overlapping reservations.
- Health endpoint `/health`.
- Correlation IDs: send `X-Correlation-Id` (echoed back and logged).

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
# Coverage: ~85% (domain: 95%, adapters: 75%, API: 90%)
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

## Performance Benchmarks (Local Testing)

- POST /api/reservations: ~5ms (in-memory), ~15ms (Prisma)
- GET /api/reservations/:id: ~1ms (cached), ~8ms (uncached)
- Health endpoint: ~1ms

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
- Pricing rules covered and tested (base, length discount, weekend +25%, breakfast per guest/day).
