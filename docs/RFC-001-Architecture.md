# RFC-001: StellarStay Hotels Architecture

## Executive Summary
- Build a scalable, reliable reservation system with clear hexagonal boundaries.
- Implement Option B endpoints to validate pricing, persistence, idempotency, and reliability.

## Service Architecture (Hexagonal)
- Reservation Service: coordinates booking lifecycle and idempotency.
- Pricing Service: deterministic price calculation with ordered rules.
- Room Service: inventory (seeded for demo), availability checks (simplified).
- Payment Service: mocked adapter; real provider port defined.

Ports (primary): HTTP REST controllers.
Ports (secondary): ReservationRepository, RoomAvailabilityProvider, PaymentGateway, CacheProvider.
Adapters: Prisma (Postgres), InMemory repos, Redis cache, Mock payment.

## Communication
- REST
  - POST `/api/reservations`
  - GET `/api/reservations/{id}`
- Error structure: `{ code, message, details? }` with 4xx/5xx.
- Idempotency: `idempotency-key` header for POST.

## Data Architecture
- Postgres (production path), In-Memory (dev default) via repository port.
- Tables: `Room`, `Reservation` (pricingBreakdown JSON, idempotencyKey unique).
- Consistency: strong for reservations; store pricing breakdown for audit.

## Reliability & Observability
- Timeouts and retries on external ports (payment, cache) (to be added next).
- Health endpoint `/health`.
- Structured logs via Fastify logger.

## Scalability
- Stateless API; horizontal scale behind LB.
- Redis for hot reads/caching (availability cache planned).
- Read/write separation considered for Postgres in future.

## Technology Choices
- Node.js + Fastify, zod, Prisma (Postgres), Redis, Jest/Vitest.
- Rationale: performance, DX, clarity, and testability.

## Security
- Input validation (zod), minimal PII in logs, env-based secrets.

## Open Questions / Future Work
- External payment provider integration.
- Async messaging for notifications.
- Circuit breaker and metrics (Prometheus) wiring.
