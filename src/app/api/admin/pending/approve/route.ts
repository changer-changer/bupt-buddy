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

    if (pending.status !== 'PENDING') {
      return NextResponse.json({ error: '已处理' }, { status: 400 })
    }

    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    const newUser = await prisma.user.create({
      data: {
        email: pending.email,
        emailVerified: new Date(),
        nickname: pending.name || pending.email.split('@')[0],
        role: adminExists ? 'USER' : 'ADMIN',
      },
    })

    await prisma.pendingApproval.update({
      where: { id },
      data: { status: 'APPROVED' },
    })

    await logAdminAction({
      actorId: user.userId,
      action: 'APPROVE_PENDING',
      targetType: 'PendingApproval',
      targetId: id,
      details: `通过注册申请: ${pending.email}`,
      ip: getClientIp(req),
    })

    return NextResponse.json({ success: true, user: newUser })
  } catch (err) {
    console.error('Approve error:', err)
    return NextResponse.json({ error: '审批失败' }, { status: 500 })
  }
}
