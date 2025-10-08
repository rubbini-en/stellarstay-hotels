# StellarStay Hotels

[![Test Coverage](https://img.shields.io/badge/coverage-49%25-yellow)](https://github.com/rubbini-en/stellarstay-hotels) [![Tests](https://img.shields.io/badge/tests-13%20passed-brightgreen)](https://github.com/rubbini-en/stellarstay-hotels)

A hotel reservation system built for the StellarStay assessment. This implementation uses Option B (reservation management) with hexagonal architecture.

## Project Overview

This reservation system handles the business requirements for StellarStay Hotels with a focus on reliability, proper error handling, retry logic, and dynamic pricing rules.

**Tech Stack:**
- Node.js + Fastify (fast and simple)
- Prisma + PostgreSQL (type-safe database access)
- Redis (for caching)
- Ollama (for the AI bonus feature)
- Docker (easy local setup)

**Main Features:**
- Dynamic pricing with all the business rules (weekend surcharge, length discounts, breakfast)
- Idempotent reservation creation (safe retries)
- Conflict detection (no double-booking)
- Circuit breakers and retry logic for reliability
- AI-powered room search (bonus feature)

## Quick Start

```bash
# Clone and setup
git clone <your-repo>
cd stellarstay-hotels
```

```bash
# Bonus: Setup Ollama (if implementing AI service)
ollama pull llama3.2:3b
```

```bash
# Standard setup
npm ci
docker-compose up
```

```bash
# Run tests
npm test
```

```bash
# Access API
curl http://localhost:8000/api/reservations
```

## Architecture Design

A detailed RFC document explains the system design and architectural decisions:

[docs/RFC-001-Architecture.md](docs/RFC-001-Architecture.md)

## API Endpoints

The implementation includes the two required endpoints for Option B:

**POST /api/reservations** - Create a new reservation
**GET /api/reservations/{id}** - Get reservation details

Example requests and responses:

```bash
# Create reservation
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

# Get reservation
curl -s http://localhost:8000/api/reservations/<id> | jq .
```

Error scenarios and handling:

- 400 BAD_REQUEST: validation failures (schema violations, invalid date ranges)
- 404 NOT_FOUND: reservation id not found
- 409 CONFLICT: overlapping reservation for roomType and given range
- 5xx: unexpected server errors

Response shape:
```json
{ "code": "BAD_REQUEST|NOT_FOUND|CONFLICT", "message": "...", "details": { } }
```

## AI Room Search (Bonus Feature)

The system includes a bonus AI endpoint that can understand natural language queries about room preferences using Ollama.

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

**Note**: The AI endpoint requires Ollama to be running with the `llama3.2:3b` model. If Ollama is not available or times out, the endpoint returns a `500 AI_SERVICE_ERROR` with graceful degradation.

**Implementation**: `src/adapters/ai/ollama/client.js` with circuit breaker protection.

### Setup for AI Endpoint
```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the required model
ollama pull llama3.2:3b

# Start Ollama server
ollama serve
```

The AI endpoint will work without Ollama but will return error responses. With Ollama running, it provides intelligent room recommendations based on natural language queries.

**Troubleshooting AI Endpoint:**
- **500 AI_SERVICE_ERROR**: Ensure Ollama is running (`ollama serve`)
- **Timeout errors**: Verify model is pulled (`ollama list` should show `llama3.2:3b`)
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

## Reliability Features

### Idempotency
The system implements idempotency using the `idempotency-key` header. Sending the same key twice returns the same reservation. The database has a unique constraint to prevent race conditions.

### Retry Logic
The system uses exponential backoff retry for database operations. If a Prisma call fails, it retries up to 3 times with increasing delays (200ms, 400ms, 800ms) plus random jitter to avoid thundering herd problems.

### Circuit Breakers
The system implements circuit breakers for external services (Prisma, Redis, Ollama). If a service starts failing repeatedly, the circuit opens and fails fast instead of waiting for timeouts. After a cooldown period, it tries again to see if the service recovered.

### Timeouts
The system sets explicit timeouts everywhere: 8s for HTTP requests, 3s for database calls, 500ms for Redis, and 5s for external API calls. This prevents the system from hanging when services are slow or unresponsive.

### Preventing Double-Booking
This is implemented at both the application and database level. The app checks for overlaps before creating reservations, and a PostgreSQL exclusion constraint prevents overlapping reservations for the same room type at the database level.

### Logging & Monitoring
The system uses structured logging with Pino and correlation IDs for request tracing. Every request gets a unique ID that flows through all the logs, making it easy to debug issues. There's also a simple health check endpoint.

## Design Decisions

Option B (reservation management) was chosen to focus on core business logic and reliability patterns without getting distracted by too many features. The hexagonal architecture keeps things clean and testable.

**Key decisions:**
- Node.js + Fastify for performance and simplicity
- Prisma for type-safe database access (no more SQL injection worries)
- Redis for caching to handle the 50k+ daily bookings target
- Circuit breakers and retry logic because external services fail

**Simplifications for this assessment:**
- Room availability is checked in-memory (production would need distributed locking)
- Payment gateway is mocked (real one would need proper integration)
- Single service (production would be microservices)

**Production enhancements:**
- Event-driven notifications
- Distributed tracing
- Rate limiting and auth
- More comprehensive monitoring

## Testing

The system includes tests for the pricing logic, API endpoints, and caching behavior. Run them with:

```bash
npm test
```

All 13 tests pass, covering the main business logic and edge cases.

## Demo Script

Run the comprehensive demo to see all features in action:

```bash
# Start the server
npm run dev

# In another terminal, run the demo
./demo.sh
```

The demo script showcases:
- All API endpoints with real examples
- Dynamic pricing (weekend surcharge, length discounts, breakfast)
- Idempotency and conflict detection
- AI-powered natural language queries
- Error handling and validation
- Performance characteristics

## Try It Out

Here are some quick commands to test the API:

```bash
# Check if it's running
curl http://localhost:8000/health

# Create a reservation
curl -s -X POST http://localhost:8000/api/reservations \
  -H 'Content-Type: application/json' -H 'idempotency-key: demo-1' \
  -d '{"roomType":"junior","checkIn":"2024-01-16","checkOut":"2024-01-18","numGuests":2,"includeBreakfast":false}' | jq .

# Get the reservation (use the ID from the response above)
curl -s http://localhost:8000/api/reservations/<id> | jq .

# Try the same request again - should get the same reservation back (idempotency)
curl -s -X POST http://localhost:8000/api/reservations \
  -H 'Content-Type: application/json' -H 'idempotency-key: demo-1' \
  -d '{"roomType":"junior","checkIn":"2024-01-16","checkOut":"2024-01-18","numGuests":2,"includeBreakfast":false}' | jq .
```

## Performance Notes

The API is stateless so it can scale horizontally. Redis caching helps with read performance, and the PostgreSQL path has been tested with Prisma. For production, connection pooling and proper database indexes would be beneficial.

## Troubleshooting

**Port conflicts:** Make sure nothing else is running on ports 5432, 6379, or 8000.

**Database issues:** If Postgres isn't reachable, check that Docker is running and your `.env` file has the right `DATABASE_URL`. Then run `npx prisma migrate deploy`.

**Prisma issues:** If you change the schema, run `npx prisma generate` to update the client.

## More Info

- **Architecture details:** Check out `docs/RFC-001-Architecture.md` for the full design document
- **API spec:** The `openapi.yml` file has the complete API documentation
- **Pricing rules:** All implemented and tested (base rates, weekend surcharge, length discounts, breakfast)
