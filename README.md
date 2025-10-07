# StellarStay Hotels

Production-style slice for the assessment using Hexagonal Architecture and Option B endpoints.

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

## Caching

- Cache-aside for GET `/api/reservations/{id}` using Redis with a 5‑minute TTL.
- On successful POST create, cache for that reservation id is invalidated.
- Cache failures are non-fatal (best-effort).

## Reliability

- Idempotency on POST via `idempotency-key` header (safe retries return prior result).
- Retry/backoff (exponential + jitter, 3 attempts) for Prisma repository calls.
- Health endpoint `/health`.
- Correlation IDs: send `X-Correlation-Id` (echoed back and logged).

## Runbook

- Tests: `npm test`
- Start (in-memory): `npm run dev`
- Start (Prisma): `USE_PRISMA=1 npm run dev`
- Seed DB: `npm run seed`
- Compose (DB/Redis): `docker-compose up -d`

## Troubleshooting

- Port conflicts: stop other processes on 5432/6379/8000.
- Postgres not reachable: ensure Docker is running, `.env` has correct `DATABASE_URL`, run `npx prisma migrate deploy`.
- Prisma client: re-generate via `npx prisma generate` after schema changes.

## Documentation

- Architecture RFC: `docs/RFC-001-Architecture.md` (includes reliability details and diagram).
- Pricing rules covered and tested (base, length discount, weekend +25%, breakfast per guest/day).
