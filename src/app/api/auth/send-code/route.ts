import { NextResponse } from 'next/server'
import { setCode } from '@/lib/verify-code-store'
import { sendVerificationEmail } from '@/lib/email'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function isBuptEmail(email: string): boolean {
  return email.endsWith('@bupt.cn')
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '邮箱必填' }, { status: 400 })
    }

    if (!isBuptEmail(email)) {
      return NextResponse.json({ error: '仅支持 @bupt.cn 邮箱' }, { status: 400 })
    }

    const code = generateCode()
    setCode(email, code, 10)

    const result = await sendVerificationEmail(email, code)

    return NextResponse.json({
      success: true,
      message: result.fallback ? '验证码已生成' : '验证码已发送（如未收到请见下方）',
      fallback: result.fallback,
      code,
    })
  } catch {
    return NextResponse.json({ error: '发送失败' }, { status: 500 })
  }
}
