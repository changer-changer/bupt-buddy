import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/audit-log'
import { getClientIp } from '@/lib/ip-check'

export async function POST(req: Request) {
  const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (adminExists) {
    return NextResponse.json({ error: '管理员已存在' }, { status: 403 })
  }

  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: '邮箱必填' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    })

    await logAdminAction({
      action: 'SETUP_ADMIN',
      targetType: 'User',
      targetId: user.id,
      details: `设置初始管理员: ${email}`,
      ip: getClientIp(req),
    })

    return NextResponse.json({ success: true, message: '已设为管理员，请重新登录' })
  } catch {
    return NextResponse.json({ error: '设置失败' }, { status: 500 })
  }
}
