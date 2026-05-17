import { NextResponse } from 'next/server'
import { setCode } from '@/lib/verify-code-store'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function isBuptEmail(email: string): boolean {
  return email.endsWith('@bupt.cn')
}

export async function POST(req: Request) {
  const ip = getRateLimitIdentifier(req)

  const ipLimit = rateLimit(ip, 'send-code:ip', { limit: 3, windowMs: 60_000 })
  if (!ipLimit.success) {
    return NextResponse.json({ error: '发送太频繁，请稍后再试' }, { status: 429 })
  }

  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '邮箱必填' }, { status: 400 })
    }

    if (!isBuptEmail(email)) {
      return NextResponse.json({ error: '仅支持 @bupt.cn 邮箱' }, { status: 400 })
    }

    const emailLimit = rateLimit(email, 'send-code:email', { limit: 10, windowMs: 86_400_000 })
    if (!emailLimit.success) {
      return NextResponse.json({ error: '该邮箱今日发送次数已达上限' }, { status: 429 })
    }

    const code = generateCode()
    setCode(email, code, 10)

    const result = await sendVerificationEmail(email, code)

    return NextResponse.json({
      success: true,
      message: result.fallback ? '验证码已生成（控制台查看）' : '验证码已发送',
      fallback: result.fallback,
    })
  } catch {
    return NextResponse.json({ error: '发送失败' }, { status: 500 })
  }
}
