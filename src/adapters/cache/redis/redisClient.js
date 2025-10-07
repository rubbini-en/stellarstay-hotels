import Redis from 'ioredis';

let redisSingleton;

export function getRedis() {
  if (!redisSingleton) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisSingleton = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  }
  return redisSingleton;
}

