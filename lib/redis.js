// Redis utilities for caching and session management
// For production use with Upstash Redis

let redis = null;

export async function initRedis() {
  const useRedis = process.env.REDIS_URL && process.env.USE_REAL_REDIS === 'true';
  
  if (!useRedis) {
    console.log('📦 Using in-memory cache (for development/demo)');
    return { isMemory: true, cache: new Map() };
  }
  
  try {
    // Dynamic import for Redis (only if needed)
    const Redis = await import('ioredis');
    
    redis = new Redis.default(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      }
    });
    
    // Test connection
    await redis.ping();
    console.log('✅ Redis connected successfully');
    
    return { isMemory: false, redis };
  } catch (error) {
    console.error('❌ Redis connection failed, falling back to memory:', error.message);
    return { isMemory: true, cache: new Map() };
  }
}

// In-memory cache fallback
const memoryCache = new Map();

export async function getCache(key) {
  if (redis) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }
  
  // Memory fallback
  const cached = memoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }
  memoryCache.delete(key);
  return null;
}

export async function setCache(key, value, ttlSeconds = 3600) {
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      console.error('Redis set error:', error);
    }
    return;
  }
  
  // Memory fallback
  memoryCache.set(key, {
    value,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

export async function deleteCache(key) {
  if (redis) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
    return;
  }
  
  // Memory fallback
  memoryCache.delete(key);
}

export async function getProfile(siteId, clientId) {
  const key = `profile:${siteId}:${clientId}`;
  return await getCache(key);
}

export async function setProfile(siteId, clientId, profile, ttlSeconds = 86400) {
  const key = `profile:${siteId}:${clientId}`;
  await setCache(key, profile, ttlSeconds);
}

export async function getSession(sessionId) {
  const key = `session:${sessionId}`;
  return await getCache(key);
}

export async function setSession(sessionId, data, ttlSeconds = 1800) {
  const key = `session:${sessionId}`;
  await setCache(key, data, ttlSeconds);
}

export async function incrementCounter(key, increment = 1) {
  if (redis) {
    try {
      return await redis.incrby(key, increment);
    } catch (error) {
      console.error('Redis increment error:', error);
      return null;
    }
  }
  
  // Memory fallback
  const current = memoryCache.get(key)?.value || 0;
  const newValue = current + increment;
  memoryCache.set(key, {
    value: newValue,
    expiry: Date.now() + 86400000 // 24 hours
  });
  return newValue;
}

export default {
  initRedis,
  getCache,
  setCache,
  deleteCache,
  getProfile,
  setProfile,
  getSession,
  setSession,
  incrementCounter
};