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
