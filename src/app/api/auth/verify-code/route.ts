import { NextResponse } from 'next/server'
import { verifyCode } from '@/lib/verify-code-store'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: '邮箱和验证码必填' }, { status: 400 })
    }

    if (!verifyCode(email, code)) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 })
    }

    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
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

    console.log(`[LOGIN] user=${user.email} token_set=ok`)

    return response
  } catch {
    return NextResponse.json({ error: '验证失败' }, { status: 500 })
  }
}
