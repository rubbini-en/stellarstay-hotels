import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';

let app;

describe('Cache', () => {
  beforeAll(async () => { app = await buildServer(); await app.ready(); });
  afterAll(async () => { if (app) await app.close(); });

  it('GET by id hits cache on second call', async () => {
    const create = await app.inject({ method: 'POST', url: '/api/reservations', payload: { roomType: 'junior', checkIn: '2024-04-01', checkOut: '2024-04-03', numGuests: 1, includeBreakfast: false } });
    expect(create.statusCode).toBe(201);
    const id = create.json().id;

    const first = await app.inject({ method: 'GET', url: '/api/reservations/' + id });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({ method: 'GET', url: '/api/reservations/' + id });
    expect(second.statusCode).toBe(200);
  });
});
