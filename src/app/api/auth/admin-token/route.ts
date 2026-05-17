import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/jwt'
import { signAdminActionToken } from '@/lib/admin-token'
import { logAdminAction } from '@/lib/audit-log'
import { getClientIp } from '@/lib/ip-check'

const ADMIN_ACTION_PASSWORD = process.env.ADMIN_ACTION_PASSWORD || 'czxCZX200686!'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { password } = await req.json()
    if (!password) {
      return NextResponse.json({ error: '密码必填' }, { status: 400 })
    }

    if (password !== ADMIN_ACTION_PASSWORD) {
      return NextResponse.json({ error: '密码错误' }, { status: 400 })
    }

    const actionToken = signAdminActionToken(user.userId, user.email)

    await logAdminAction({
      actorId: user.userId,
      action: 'ADMIN_GUARD_VERIFY',
      targetType: 'Admin',
      targetId: user.userId,
      details: `管理员二次验证通过`,
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
