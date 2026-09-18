import type { ConnectionOptions } from 'bullmq';

export function redisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  const database = Number(url.pathname.replace('/', '') || '0');
  return {
    host: url.hostname,
    port: Number(url.port || '6379'),
    username: url.username || undefined,
    password: url.password || undefined,
    db: database,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
