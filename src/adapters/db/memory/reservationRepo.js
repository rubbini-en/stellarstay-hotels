const store = new Map();

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
};

