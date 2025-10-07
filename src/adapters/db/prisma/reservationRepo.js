import { getPrisma } from './client.js';
import { withRetry } from '../../../domain/retry.js';

export const PrismaReservationRepo = {
  async create(reservation) {
    const prisma = getPrisma();
    return await withRetry(async () => {
      const created = await prisma.reservation.create({
        data: {
          id: reservation.id,
          roomType: reservation.roomType,
          checkIn: new Date(reservation.checkIn),
          checkOut: new Date(reservation.checkOut),
          numGuests: reservation.numGuests,
          includeBreakfast: reservation.includeBreakfast,
          totalPriceCents: reservation.totalPriceCents,
          pricingBreakdown: reservation.pricingBreakdown,
          idempotencyKey: reservation.idempotencyKey,
        },
      });
      return {
        ...created,
        checkIn: created.checkIn.toISOString(),
        checkOut: created.checkOut.toISOString(),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    }, { retries: 3, baseDelayMs: 200, jitterMs: 100 });
  },

  async findById(id) {
    const prisma = getPrisma();
    return await withRetry(async () => {
      const found = await prisma.reservation.findUnique({
        where: { id: String(id) },
      });
      if (!found) return null;
      return {
        ...found,
        checkIn: found.checkIn.toISOString(),
        checkOut: found.checkOut.toISOString(),
        createdAt: found.createdAt.toISOString(),
        updatedAt: found.updatedAt.toISOString(),
      };
    }, { retries: 3, baseDelayMs: 200, jitterMs: 100 });
  },

  async findByIdempotencyKey(key) {
    const prisma = getPrisma();
    return await withRetry(async () => {
      const found = await prisma.reservation.findUnique({
        where: { idempotencyKey: String(key) },
      });
      if (!found) return null;
      return {
        ...found,
        checkIn: found.checkIn.toISOString(),
        checkOut: found.checkOut.toISOString(),
        createdAt: found.createdAt.toISOString(),
        updatedAt: found.updatedAt.toISOString(),
      };
    }, { retries: 3, baseDelayMs: 200, jitterMs: 100 });
  },

  async hasOverlap(roomType, checkInISO, checkOutISO) {
    const prisma = getPrisma();
    const checkIn = new Date(checkInISO);
    const checkOut = new Date(checkOutISO);
    return await withRetry(async () => {
      const overlapping = await prisma.reservation.findFirst({
        where: {
          roomType: String(roomType),
          AND: [
            { checkIn: { lt: checkOut } },
            { checkOut: { gt: checkIn } },
          ],
        },
        select: { id: true },
      });
      return overlapping !== null;
    }, { retries: 3, baseDelayMs: 200, jitterMs: 100 });
  },
};