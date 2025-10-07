# RFC-001: StellarStay Hotels Architecture

## Executive Summary
- Build a scalable, reliable reservation system with clear hexagonal boundaries.
- Implement Option B endpoints to validate pricing, persistence, idempotency, and reliability.
- Targets: 50k+ bookings/day, 99.9% uptime during peaks.

## Service Architecture (Hexagonal)
- Reservation Service: coordinates booking lifecycle and idempotency.
- Pricing Service: deterministic price calculation with ordered rules.
- Room Service: inventory (seeded), overlap checking per roomType.
- Payment Service: mocked adapter; real provider port defined.

Primary Port: REST controllers. Secondary Ports: ReservationRepository, RoomAvailabilityProvider, PaymentGateway, CacheProvider.

```mermaid
graph TD;
  A[API (Fastify)] --> B[Use Case / Handlers];
  B --> C[Pricing Engine];
  B --> D[ReservationRepository Port];
  D --> E[Prisma Adapter (Postgres)];
  D --> F[InMemory Adapter];
  B --> G[CacheProvider Port];
  G --> H[Redis Adapter];
  B --> I[PaymentGateway Port];
  I --> J[Mock Payment];
```

## Communication
- REST endpoints (Option B): `POST /api/reservations`, `GET /api/reservations/{id}`.
- Errors: `{ code, message, details? }` with 400/404/409/5xx.
- Idempotency: `idempotency-key` header ensures safe retries.

## Data Architecture
- Postgres (production path), In-Memory (dev/tests) via repository port.
- Tables: `Room`, `Reservation` (fields include pricingBreakdown JSON, idempotencyKey unique).
- Consistency: strong for reservations; store pricing breakdown for audit.

## Reliability & Observability
- Retry/backoff: outbound ports use exponential backoff with jitter (retries=3, base=200ms).
- Timeouts: enforced at HTTP/client layers (extend to axios/undici; Prisma relies on driver timeouts).
- Availability check: overlap detection per roomType returning 409.
- Idempotency on POST: duplicate keys return prior result.
- Health: `/health`; add readiness checks for DB/Redis when enabled.
- Logging: structured with correlation IDs (`X-Correlation-Id`).
- Metrics (future): add Prometheus counters/histograms for request count/latency and errors.

## Scalability
- Stateless API; horizontal scaling behind a load balancer.
- Caching with Redis for hot GETs; TTL-based invalidation on create.
- DB considerations: read replicas, connection pooling as traffic grows.

## Pricing Rules (Order)
1. Base rate per room type per day.
2. Length discount adjusts per-day rate (4–6: -$4, 7–9: -$8, 10+: -$12).
3. Weekend multiplier +25% applied per day.
4. Breakfast surcharge +$5 per guest per day.

## Technology Choices
- Node.js + Fastify, zod, Prisma (Postgres), Redis, Vitest + supertest.
- Rationale: speed, clarity, testability, and straightforward hexagonal wiring.

## Security
- Input validation (zod); no secrets in repo; env-based config.

## Error Taxonomy
- 400 BAD_REQUEST (validation, invalid date ranges)
- 404 NOT_FOUND (reservation id missing)
- 409 CONFLICT (overlap detected)
- 5xx internal/unexpected errors

## Future Work
- Payment gateway integration with retries + circuit breaker.
- Outbox + Kafka for reservation-created events.
- Prometheus + Grafana dashboards and alerts.
- OpenAPI/Swagger documentation.
