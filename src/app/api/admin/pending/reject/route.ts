import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'
import { logAdminAction } from '@/lib/audit-log'
import { getClientIp } from '@/lib/ip-check'
import { verifyAdminActionGuard } from '@/lib/admin-guard'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const limit = rateLimit(ip, 'admin:action', { limit: 30, windowMs: 60_000 })
  if (!limit.success) {
    return NextResponse.json({ error: '操作太频繁，请稍后再试' }, { status: 429 })
  }

  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const guard = await verifyAdminActionGuard()
  if (!guard) {
    return NextResponse.json({ error: '管理操作需要二次验证，请重新验证管理员身份' }, { status: 403 })
  }

  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'ID 必填' }, { status: 400 })
    }

    const pending = await prisma.pendingApproval.findUnique({ where: { id } })
    if (!pending) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    await prisma.pendingApproval.update({
      where: { id },
      data: { status: 'REJECTED' },
    })

    await logAdminAction({
      actorId: user.userId,
      action: 'REJECT_PENDING',
      targetType: 'PendingApproval',
      targetId: id,
      details: `拒绝注册申请: ${pending.email}`,
      ip: getClientIp(req),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
