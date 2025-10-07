import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { calculatePriceCents } from '../domain/pricing.js';
import { InMemoryReservationRepo } from '../adapters/db/memory/reservationRepo.js';

const postSchema = z.object({
  roomType: z.enum(['junior', 'king', 'presidential']),
  checkIn: z.string(),
  checkOut: z.string(),
  numGuests: z.number().int().positive(),
  includeBreakfast: z.boolean().default(false),
});

export async function registerRoutes(app) {
  app.get('/api/ping', async () => ({ pong: true }));

  // Force in-memory repository to avoid Postgres dependency during local run
  const repo = InMemoryReservationRepo;
  app.log.info({ repoType: 'memory' }, 'reservation_repo_selected');

  app.post('/api/reservations', async (req, reply) => {
    const idempotencyKey = req.headers['idempotency-key'];
    try {
      const input = postSchema.parse(req.body);
      if (idempotencyKey) {
        const existing = await repo.findByIdempotencyKey(String(idempotencyKey));
        if (existing) return existing;
      }
      const pricing = calculatePriceCents(input);
      const reservation = {
        id: randomUUID(),
        roomType: input.roomType,
        checkIn: new Date(input.checkIn).toISOString(),
        checkOut: new Date(input.checkOut).toISOString(),
        numGuests: input.numGuests,
        includeBreakfast: input.includeBreakfast,
        totalPriceCents: pricing.totalCents,
        pricingBreakdown: pricing,
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
      };
      await repo.create(reservation);
      reply.code(201);
      return reservation;
    } catch (err) {
      app.log.error({ err, repoType: 'memory' }, 'create_reservation_failed');
      reply.code(400);
      return { code: 'BAD_REQUEST', message: err.message };
    }
  });

  app.get('/api/reservations/:id', async (req, reply) => {
    const { id } = req.params;
    const found = await repo.findById(String(id));
    if (!found) {
      reply.code(404);
      return { code: 'NOT_FOUND', message: 'Reservation not found' };
    }
    return found;
  });
}
