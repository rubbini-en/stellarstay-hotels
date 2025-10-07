import { randomUUID } from 'node:crypto';

export function correlationIdPlugin(app, _opts, done) {
  app.addHook('onRequest', async (req, reply) => {
    const incoming = req.headers['x-correlation-id'];
    const cid = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();
    req.correlationId = cid;
    reply.header('X-Correlation-Id', cid);
    req.log = req.log.child({ correlationId: cid });
  });
  done();
}
