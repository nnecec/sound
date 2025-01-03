import { LRUCache } from "lru-cache"

export function createCache() {
  return new LRUCache<string, AudioBuffer>({
    max: 500,
    ttl: 1000 * 60 * 5,
    allowStale: false,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
  })
}
