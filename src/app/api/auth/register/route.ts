import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'
import { isBuptIp, getClientIp } from '@/lib/ip-check'

function isBuptEmail(email: string): boolean {
  return email.endsWith('@bupt.cn')
}

export async function POST(req: Request) {
  try {
    const { email, name, studentId } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '邮箱必填' }, { status: 400 })
    }

    if (!isBuptEmail(email)) {
      return NextResponse.json({ error: '仅支持 @bupt.cn 邮箱' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const onCampus = isBuptIp(ip)

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      const token = signToken({
        userId: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      })
      const response = NextResponse.json({ success: true, user: existingUser })
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return response
    }

    if (onCampus) {
      const user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
          nickname: name || email.split('@')[0],
        },
      })

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
    }

    const pending = await prisma.pendingApproval.upsert({
      where: { email },
      update: { name: name || undefined, studentId: studentId || undefined, status: 'PENDING' },
      create: { email, name, studentId },
    })

    return NextResponse.json({
      success: true,
      onCampus: false,
      pendingId: pending.id,
      message: '你当前不在校园网，已提交审核申请，请等待管理员通过',
    })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: '注册失败' }, { status: 500 })
  }
}
