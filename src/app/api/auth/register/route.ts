import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'
import { isBuptIp, getClientIp } from '@/lib/ip-check'

function generateCampusEmail(name: string): string {
  const timestamp = Date.now().toString(36)
  const safeName = name.trim().replace(/\s+/g, '-')
  return `campus-${safeName}-${timestamp}@bupt.cn`
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json()

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: '姓名必填（至少2个字）' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const onCampus = isBuptIp(ip)

    console.log('[REGISTER] name=' + name.trim() + ' ip=' + ip + ' onCampus=' + onCampus)

    if (!onCampus) {
      return NextResponse.json(
        { error: '你当前不在校园网，请连接校园网后使用一键登录' },
        { status: 403 }
      )
    }

    // Try to find existing user by nickname (campus login)
    const trimmedName = name.trim()
    let user = await prisma.user.findFirst({
      where: { nickname: trimmedName },
    })

    if (!user) {
      const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
      const email = generateCampusEmail(trimmedName)

      user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
          nickname: trimmedName,
          role: adminExists ? 'USER' : 'ADMIN',
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
