import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'ID 必填' }, { status: 400 })
    }

    const pending = await prisma.pendingApproval.findUnique({ where: { id } })
    if (!pending) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    if (pending.status !== 'PENDING') {
      return NextResponse.json({ error: '已处理' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        email: pending.email,
        emailVerified: new Date(),
        nickname: pending.name || pending.email.split('@')[0],
      },
    })

    await prisma.pendingApproval.update({
      where: { id },
      data: { status: 'APPROVED' },
    })

    return NextResponse.json({ success: true, user })
  } catch (err) {
    console.error('Approve error:', err)
    return NextResponse.json({ error: '审批失败' }, { status: 500 })
  }
}
