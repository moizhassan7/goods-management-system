import Redis from 'ioredis';

type MemoryEntry = { value: string; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
    if (redisClient !== undefined) return redisClient;

    const url = process.env.REDIS_URL?.trim();
    if (!url) {
        redisClient = null;
        return null;
    }

    try {
        redisClient = new Redis(url, {
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
        });
        redisClient.on('error', (error) => {
            console.warn('Redis cache unavailable, using in-memory cache:', error.message);
        });
        return redisClient;
    } catch (error) {
        console.warn('Redis cache init failed, using in-memory cache:', error);
        redisClient = null;
        return null;
    }
}

export const CACHE_KEYS = {
    MASTER_LISTS: 'gms:master:lists',
    MASTER_CITIES: 'gms:master:cities',
    MASTER_AGENCIES: 'gms:master:agencies',
    MASTER_VEHICLES: 'gms:master:vehicles',
    MASTER_PARTIES: 'gms:master:parties',
    MASTER_ITEMS: 'gms:master:items',
} as const;

const MASTER_CACHE_KEYS = Object.values(CACHE_KEYS);

const MASTER_TTL_SECONDS = 300;

function readMemory<T>(key: string): T | null {
    const hit = memoryCache.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
        memoryCache.delete(key);
        return null;
    }
    try {
        return JSON.parse(hit.value) as T;
    } catch {
        memoryCache.delete(key);
        return null;
    }
}

function writeMemory(key: string, serialized: string, ttlSeconds: number) {
    memoryCache.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
    const memory = readMemory<T>(key);
    try {
        const redis = getRedis();
        if (!redis) return memory;
        const value = await redis.get(key);
        if (!value) return memory;
        return JSON.parse(value) as T;
    } catch {
        return memory;
    }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = MASTER_TTL_SECONDS) {
    const serialized = JSON.stringify(value);
    writeMemory(key, serialized, ttlSeconds);
    try {
        const redis = getRedis();
        if (redis) {
            await redis.set(key, serialized, 'EX', ttlSeconds);
        }
    } catch {
        // Ignore remote cache set failures. In-memory copy is already stored.
    }
}

export async function cacheDel(key: string) {
    memoryCache.delete(key);
    try {
        const redis = getRedis();
        if (redis) await redis.del(key);
    } catch {
        // Ignore remote delete failures.
    }
}

export async function getOrSetCache<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds = MASTER_TTL_SECONDS,
): Promise<T> {
    const cached = await cacheGet<T>(key);
    if (cached !== null) return cached;
    const data = await loader();
    await cacheSet(key, data, ttlSeconds);
    return data;
}

export async function invalidateMasterCache() {
    await Promise.all(MASTER_CACHE_KEYS.map((key) => cacheDel(key)));
}

export const MASTER_CACHE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
};
