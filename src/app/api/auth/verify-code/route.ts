import { NextResponse } from 'next/server'
import { verifyCode } from '@/lib/verify-code-store'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const ip = getRateLimitIdentifier(req)

  const limit = rateLimit(ip, 'verify-code', { limit: 20, windowMs: 3_600_000 })
  if (!limit.success) {
    return NextResponse.json({ error: '验证太频繁，请稍后再试' }, { status: 429 })
  }

  try {
    const { email, code, setupKey } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: '邮箱和验证码必填' }, { status: 400 })
    }

    if (!verifyCode(email, code)) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 })
    }

    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN', deletedAt: null } })

    if (!adminExists) {
      // Creating first admin — require setup key
      const expectedKey = process.env.ADMIN_SETUP_KEY
      if (!expectedKey) {
        return NextResponse.json(
          { error: '系统未配置管理员注册密钥，请联系运维人员' },
          { status: 500 }
        )
      }
      if (setupKey !== expectedKey) {
        return NextResponse.json(
          { error: '管理员注册密钥错误' },
          { status: 403 }
        )
      }
    }

    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
          nickname: email.split('@')[0],
          role: adminExists ? 'USER' : 'ADMIN',
        },
      })
    } else if (!user.emailVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      })
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    console.log(`[LOGIN] user=${user.email} role=${user.role} token_set=ok`)

    return response
  } catch {
    return NextResponse.json({ error: '验证失败' }, { status: 500 })
  }
}
