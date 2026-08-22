// High-performance in-memory cache for Supabase reads
// Fast response times with automatic invalidation on writes

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<any>>();
const MAX_CACHE_ENTRIES = 500;

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  if (ttlMs <= 0) {
    return loader();
  }

  const now = Date.now();
  const existing = memoryCache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.data;
  }

  const data = await loader();

  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(key, {
    data,
    expiresAt: now + ttlMs
  });

  return data;
}

export function clearCache(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key === prefix || key.startsWith(prefix) || key.includes(prefix)) {
      memoryCache.delete(key);
    }
  }
}


