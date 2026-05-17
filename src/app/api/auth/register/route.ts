import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'
import { isBuptIp, getClientIp } from '@/lib/ip-check'
import { rateLimit } from '@/lib/rate-limit'

function generateCampusEmail(name: string): string {
  const timestamp = Date.now().toString(36)
  const safeName = name.trim().replace(/\s+/g, '-')
  return `campus-${safeName}-${timestamp}@bupt.cn`
}

export async function POST(req: Request) {
  const ip = getClientIp(req)

  const limit = rateLimit(ip, 'campus-register', { limit: 10, windowMs: 3_600_000 })
  if (!limit.success) {
    return NextResponse.json({ error: '操作太频繁，请稍后再试' }, { status: 429 })
  }

  try {
    const { name } = await req.json()

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: '姓名必填（至少2个字）' }, { status: 400 })
    }

    const onCampus = isBuptIp(ip)

    console.log('[REGISTER] name=' + name.trim() + ' ip=' + ip + ' onCampus=' + onCampus)

    if (!onCampus) {
      return NextResponse.json(
        { error: '你当前不在校园网，请连接校园网后使用一键登录' },
        { status: 403 }
      )
    }

    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN', deletedAt: null } })
    if (!adminExists) {
      return NextResponse.json(
        { error: '系统尚未初始化管理员，请使用邮箱验证方式注册' },
        { status: 403 }
      )
    }

    const trimmedName = name.trim()
    let user = await prisma.user.findFirst({
      where: { nickname: trimmedName, deletedAt: null },
    })

    if (!user) {
      const email = generateCampusEmail(trimmedName)
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
          nickname: trimmedName,
          role: 'USER',
        },
      })
      console.log('[REGISTER] created new user id=' + user.id + ' email=' + email)
    } else {
      console.log('[REGISTER] existing user login id=' + user.id)
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      user,
      onCampus: true,
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
