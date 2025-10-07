import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';

let app;

describe('API (Option B)', () => {
  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('happy path: create then get', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reservations',
      payload: { roomType: 'junior', checkIn: '2024-01-16', checkOut: '2024-01-18', numGuests: 2, includeBreakfast: true },
      headers: { 'idempotency-key': 'key-1' },
    });
    expect(res.statusCode).toBe(201);
    const created = res.json();
    const got = await app.inject({ method: 'GET', url: `/api/reservations/${created.id}` });
    expect(got.statusCode).toBe(200);
    expect(got.json().id).toBe(created.id);
  });

  it('idempotency: same key returns same reservation', async () => {
    const payload = { roomType: 'junior', checkIn: '2024-01-20', checkOut: '2024-01-22', numGuests: 1, includeBreakfast: false };
    const first = await app.inject({ method: 'POST', url: '/api/reservations', payload, headers: { 'idempotency-key': 'same-1' } });
    const second = await app.inject({ method: 'POST', url: '/api/reservations', payload, headers: { 'idempotency-key': 'same-1' } });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json().id).toBe(first.json().id);
  });

  it('validation error: bad dates', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reservations',
      payload: { roomType: 'junior', checkIn: '2024-01-18', checkOut: '2024-01-16', numGuests: 2, includeBreakfast: false },
    });
    expect(res.statusCode).toBe(400);
  });

  it('not found: GET invalid id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/reservations/not-found-id' });
    expect(res.statusCode).toBe(404);
  });

  it('conflict: overlap same roomType and dates', async () => {
    const payload = { roomType: 'king', checkIn: '2024-02-01', checkOut: '2024-02-03', numGuests: 2, includeBreakfast: false };
    const first = await app.inject({ method: 'POST', url: '/api/reservations', payload });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({ method: 'POST', url: '/api/reservations', payload });
    expect(second.statusCode).toBe(409);
  });
});
