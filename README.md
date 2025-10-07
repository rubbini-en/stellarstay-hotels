# StellarStay Hotels

Minimal implementation for the assessment with Hexagonal Architecture and Option B endpoints.

## Quick Start

```bash
# In one terminal
cd stellarstay-hotels
npm ci

# Run tests
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
  -H 'idempotency-key: any-key-1' \
  -d '{
    "roomType":"junior",
    "checkIn":"2024-01-16",
    "checkOut":"2024-01-18",
    "numGuests":2,
    "includeBreakfast":true
  }'
```

- GET `/api/reservations/{id}`
```bash
curl -s http://localhost:8000/api/reservations/<id>
```

## Error taxonomy

- 400 BAD_REQUEST: validation failures (schema violations, invalid date ranges)
- 404 NOT_FOUND: reservation id not found
- 409 CONFLICT: overlapping reservation for roomType and given range
- 5xx: unexpected server errors

Response shape:
```json
{ "code": "BAD_REQUEST|NOT_FOUND|CONFLICT", "message": "...", "details": { } }
```

## Retry and timeout policy

- Outbound adapters (Prisma/DB, Redis, payment) use an exponential backoff with jitter:
  - retries: 3, baseDelayMs: 200, jitterMs: 100 (configurable in code)
  - strategy: delay = base * 2^(attempt-1) + jitter
- Apply request timeouts at the HTTP client/driver where supported (future: add axios/undici timeouts; Prisma relies on driver/network timeouts).

## Postgres/Prisma (optional)

- Start Docker Desktop, then:
```bash
docker-compose up -d postgres redis
cp .env.example .env
npx prisma migrate deploy
npm run seed
```
- Start API with Prisma repo:
```bash
USE_PRISMA=1 npm run dev
```

## Docs
- See `docs/RFC-001-Architecture.md` for the architecture RFC.
