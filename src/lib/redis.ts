import { createClient } from 'redis';

let redisClient: any = null;

async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // Use Redis Cloud configuration from environment
  if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
    redisClient = createClient({
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT)
      }
    });
  } else if (process.env.REDIS_URL) {
    // Fallback to REDIS_URL
    redisClient = createClient({
      url: process.env.REDIS_URL
    });
  } else {
    // Local Redis fallback
    redisClient = createClient({
      url: 'redis://localhost:6379'
    });
  }

  redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err));
  
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('✅ Redis connected to:', process.env.REDIS_HOST || process.env.REDIS_URL || 'localhost:6379');
  }

  return redisClient;
}

// Initialize on module load
let initialized = false;
if (!initialized) {
  initialized = true;
  getRedisClient().catch(err => console.error('Failed to connect to Redis:', err));
}

export const redis = {
  async get(key: string) {
    const client = await getRedisClient();
    return client.get(key);
  },

  async set(key: string, value: string) {
    const client = await getRedisClient();
    return client.set(key, value);
  },

  async setEx(key: string, seconds: number, value: string) {
    const client = await getRedisClient();
    return client.setEx(key, seconds, value);
  },

  async del(key: string | string[]) {
    const client = await getRedisClient();
    return client.del(key);
  },

  async hSet(key: string, obj: Record<string, string>) {
    const client = await getRedisClient();
    return client.hSet(key, obj);
  },

  async hGetAll(key: string) {
    const client = await getRedisClient();
    return client.hGetAll(key);
  },

  async expire(key: string, seconds: number) {
    const client = await getRedisClient();
    return client.expire(key, seconds);
  },

  async sAdd(key: string, members: string | string[]) {
    const client = await getRedisClient();
    return client.sAdd(key, members);
  },

  async sRem(key: string, members: string | string[]) {
    const client = await getRedisClient();
    return client.sRem(key, members);
  },

  async sMembers(key: string) {
    const client = await getRedisClient();
    return client.sMembers(key);
  }
};
