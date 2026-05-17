import { NextResponse } from 'next/server'
import { verifyCode } from '@/lib/verify-code-store'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'
import { signAdminActionToken } from '@/lib/admin-token'
import { logAdminAction } from '@/lib/audit-log'
import { getClientIp } from '@/lib/ip-check'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { email, code } = await req.json()
    if (!email || !code) {
      return NextResponse.json({ error: '邮箱和验证码必填' }, { status: 400 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true },
    })

    if (!admin || admin.email !== email) {
      return NextResponse.json({ error: '只能使用自己的管理员邮箱验证' }, { status: 403 })
    }

    if (!verifyCode(email, code)) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 })
    }

    const actionToken = signAdminActionToken(user.userId, email)

    await logAdminAction({
      actorId: user.userId,
      action: 'ADMIN_GUARD_VERIFY',
      targetType: 'Admin',
      targetId: user.userId,
      details: `管理员二次验证通过: ${email}`,
      ip: getClientIp(req),
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_action', actionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: '验证失败' }, { status: 500 })
  }
}
