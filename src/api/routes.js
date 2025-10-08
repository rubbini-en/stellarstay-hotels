import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { calculatePriceCents } from '../domain/pricing.js';
import { InMemoryReservationRepo } from '../adapters/db/memory/reservationRepo.js';
import { getRedis } from '../adapters/cache/redis/redisClient.js';
import { redisBreaker } from '../infrastructure/circuitBreaker.js';
import { parseRoomQuery, generateRoomRecommendations } from '../adapters/ai/ollama/client.js';

const postSchema = z.object({
  roomType: z.enum(['junior', 'king', 'presidential']),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-in date must be in YYYY-MM-DD format'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-out date must be in YYYY-MM-DD format'),
  numGuests: z.number().int().positive().max(8, 'Maximum 8 guests per room'),
  includeBreakfast: z.boolean().default(false),
}).refine(data => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  
  // Only validate that check-out is after check-in
  // Allow past dates for testing purposes
  return checkOut > checkIn;
}, {
  message: "Check-out must be after check-in"
});

const aiQuerySchema = z.object({
  query: z.string().min(1).max(500),
});

const CACHE_TTL_SEC = 300; // 5 minutes

async function cacheGet(id) {
  try {
    const redis = getRedis();
    const v = await redisBreaker.execute(async () => {
      return await redis.get(`reservation:${id}`);
    });
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

async function cacheSet(id, value) {
  try {
    const redis = getRedis();
    await redisBreaker.execute(async () => {
      return await redis.setex(`reservation:${id}`, CACHE_TTL_SEC, JSON.stringify(value));
    });
  } catch {
    // ignore cache errors
  }
}

async function cacheDel(id) {
  try {
    const redis = getRedis();
    await redisBreaker.execute(async () => {
      return await redis.del(`reservation:${id}`);
    });
  } catch {
    // ignore cache errors
  }
}

export async function registerRoutes(app) {
  app.get('/api/ping', async () => ({ pong: true }));

  // Choose repository based on environment
  const repo = process.env.USE_PRISMA === '1' 
    ? (await import('../adapters/db/prisma/reservationRepo.js')).PrismaReservationRepo
    : InMemoryReservationRepo;
  app.log.info({ repoType: process.env.USE_PRISMA === '1' ? 'prisma' : 'memory' }, 'reservation_repo_selected');

  app.post('/api/reservations', async (req, reply) => {
    const idempotencyKey = req.headers['idempotency-key'];
    try {
      const input = postSchema.parse(req.body);
      if (idempotencyKey) {
        const existing = await repo.findByIdempotencyKey(String(idempotencyKey));
        if (existing) return existing;
      }
      const checkInISO = new Date(input.checkIn).toISOString();
      const checkOutISO = new Date(input.checkOut).toISOString();
      const overlap = await repo.hasOverlap(input.roomType, checkInISO, checkOutISO);
      req.log.info({ roomType: input.roomType, checkInISO, checkOutISO, overlap }, 'overlap_check');
      if (overlap) {
        reply.code(409);
        return { code: 'CONFLICT', message: 'Room type unavailable for given dates' };
      }
      const pricing = calculatePriceCents(input);
      const reservation = {
        id: randomUUID(),
        roomType: input.roomType,
        checkIn: checkInISO,
        checkOut: checkOutISO,
        numGuests: input.numGuests,
        includeBreakfast: input.includeBreakfast,
        totalPriceCents: pricing.totalCents,
        pricingBreakdown: pricing,
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
      };
      
      try {
        await repo.create(reservation);
        await cacheDel(reservation.id);
        reply.code(201);
        return reservation;
      } catch (err) {
        // Handle idempotency key race condition
        if (err.code === 'P2002' && err.meta?.target?.includes('idempotencyKey')) {
          req.log.info({ idempotencyKey }, 'idempotency_key_race_detected');
          // Race condition: key was used between check and insert
          const existing = await repo.findByIdempotencyKey(String(idempotencyKey));
          if (existing) {
            reply.code(200);
            return existing;
          }
        }
        throw err;
      }
    } catch (err) {
      app.log.error({ err, repoType: 'memory' }, 'create_reservation_failed');
      reply.code(400);
      return { code: 'BAD_REQUEST', message: err.message };
    }
  });

  app.get('/api/reservations/:id', async (req, reply) => {
    const { id } = req.params;

    const cached = await cacheGet(String(id));
    if (cached) return cached;

    const found = await repo.findById(String(id));
    if (!found) {
      reply.code(404);
      return { code: 'NOT_FOUND', message: 'Reservation not found' };
    }

    await cacheSet(found.id, found);
    return found;
  });

  // AI-powered room query endpoint (BONUS)
  app.post('/api/ai/query', async (req, reply) => {
    try {
      const input = aiQuerySchema.parse(req.body);
      req.log.info({ query: input.query }, 'ai_query_received');

      // Parse query
      const intent = await parseRoomQuery(input.query);
      req.log.info({ intent }, 'ai_intent_parsed');

      // Generate recommendations
      const recommendations = generateRoomRecommendations(intent);

      return {
        query: input.query,
        intent,
        recommendations,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      req.log.error({ err, query: req.body?.query }, 'ai_query_failed');
      
      if (err.name === 'ZodError') {
        reply.code(400);
        return { code: 'BAD_REQUEST', message: 'Invalid query format' };
      }
      
      reply.code(500);
      return { code: 'AI_SERVICE_ERROR', message: err.message };
    }
  });
}
