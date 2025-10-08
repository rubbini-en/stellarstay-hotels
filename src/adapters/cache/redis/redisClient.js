import Redis from 'ioredis';

let redisSingleton;

export function getRedis() {
  if (!redisSingleton) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisSingleton = new Redis(url, { 
      lazyConnect: true, 
      maxRetriesPerRequest: 2,
      connectTimeout: 500, // 500ms connection timeout
      commandTimeout: 500, // 500ms command timeout
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 2,
    });
  }
  return redisSingleton;
}

