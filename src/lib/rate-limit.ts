interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

function getKey(identifier: string, action: string): string {
  return `${action}:${identifier}`
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function rateLimit(
  identifier: string,
  action: string,
  options: { limit: number; windowMs: number }
): RateLimitResult {
  const key = getKey(identifier, action)
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    }
    store.set(key, newEntry)
    return { success: true, limit: options.limit, remaining: options.limit - 1, resetAt: newEntry.resetAt }
  }

  if (entry.count >= options.limit) {
    return { success: false, limit: options.limit, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { success: true, limit: options.limit, remaining: options.limit - entry.count, resetAt: entry.resetAt }
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 60_000)

// Helper to get client IP from request
export function getRateLimitIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}
