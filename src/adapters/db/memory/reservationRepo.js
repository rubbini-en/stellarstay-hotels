const store = new Map();

function isOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export const InMemoryReservationRepo = {
  async create(res) {
    store.set(res.id, res);
    return res;
  },
  async findById(id) {
    return store.get(id) || null;
  },
  async findByIdempotencyKey(key) {
    for (const value of store.values()) {
      if (value.idempotencyKey === key) return value;
    }
    return null;
  },
  async hasOverlap(roomType, checkInISO, checkOutISO) {
    const start = new Date(checkInISO);
    const end = new Date(checkOutISO);
    for (const value of store.values()) {
      if (value.roomType !== roomType) continue;
      if (value.checkIn === checkInISO && value.checkOut === checkOutISO) return true;
      const s = new Date(value.checkIn);
      const e = new Date(value.checkOut);
      if (isOverlap(start, end, s, e)) return true;
    }
    return false;
  },
};

