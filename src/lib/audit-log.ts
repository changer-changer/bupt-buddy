import { prisma } from './prisma'

export async function logAdminAction({
  actorId,
  action,
  targetType,
  targetId,
  details,
  ip,
}: {
  actorId?: string
  action: string
  targetType: string
  targetId?: string
  details?: string
  ip?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        details,
        ip,
      },
    })
  } catch (err) {
    console.error('[AUDIT_LOG] failed:', err)
  }
}
