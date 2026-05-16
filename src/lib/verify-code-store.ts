interface CodeEntry {
  code: string
  expiresAt: number
  attempts: number
}

const store = new Map<string, CodeEntry>()

export function setCode(email: string, code: string, ttlMinutes = 10) {
  store.set(email, {
    code,
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    attempts: 0,
  })
}

export function verifyCode(email: string, code: string): boolean {
  const entry = store.get(email)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    store.delete(email)
    return false
  }
  entry.attempts++
  if (entry.attempts > 5) {
    store.delete(email)
    return false
  }
  if (entry.code !== code) return false
  store.delete(email)
  return true
}

export function clearCode(email: string) {
  store.delete(email)
}
