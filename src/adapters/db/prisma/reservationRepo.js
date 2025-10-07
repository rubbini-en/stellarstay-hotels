import { getPrisma } from './client.js';

export const PrismaReservationRepo = {
  async create(reservation) {
    const prisma = getPrisma();
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
  },

  async findById(id) {
    const prisma = getPrisma();
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
  },

  async findByIdempotencyKey(key) {
    const prisma = getPrisma();
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
  },
};

