import jwt from 'jsonwebtoken'

const ADMIN_ACTION_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export interface AdminActionPayload {
  userId: string
  email: string
  type: 'admin-action'
}

export function signAdminActionToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'admin-action' } as AdminActionPayload,
    ADMIN_ACTION_SECRET,
    { expiresIn: '15m' }
  )
}

export function verifyAdminActionToken(token: string): AdminActionPayload | null {
  try {
    const payload = jwt.verify(token, ADMIN_ACTION_SECRET) as AdminActionPayload
    if (payload.type !== 'admin-action') return null
    return payload
  } catch {
    return null
  }
}
