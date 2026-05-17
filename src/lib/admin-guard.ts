import { cookies } from 'next/headers'
import { verifyAdminActionToken } from './admin-token'
import { getCurrentUser } from './jwt'

export async function verifyAdminActionGuard(): Promise<{ userId: string; email: string } | null> {
  const cookieStore = await cookies()
  const actionToken = cookieStore.get('admin_action')?.value
  if (!actionToken) return null

  const payload = verifyAdminActionToken(actionToken)
  if (!payload) return null

  const user = await getCurrentUser()
  if (!user || user.userId !== payload.userId || user.role !== 'ADMIN') return null

  return { userId: payload.userId, email: payload.email }
}
