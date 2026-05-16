import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { reason } = await req.json()
  if (!reason || typeof reason !== 'string') {
    return NextResponse.json({ error: '请填写举报原因' }, { status: 400 })
  }

  const activity = await prisma.activity.findUnique({
    where: { id },
  })

  if (!activity) {
    return NextResponse.json({ error: '活动不存在' }, { status: 404 })
  }

  if (activity.creatorId === user.userId) {
    return NextResponse.json({ error: '不能举报自己的活动' }, { status: 400 })
  }

  const existing = await prisma.report.findFirst({
    where: { activityId: id, reporterId: user.userId },
  })

  if (existing) {
    return NextResponse.json({ error: '已举报过该活动' }, { status: 400 })
  }

  await prisma.report.create({
    data: {
      activityId: id,
      reporterId: user.userId,
      reason,
    },
  })

  const reportCount = await prisma.report.count({
    where: { activityId: id, status: 'PENDING' },
  })

  if (reportCount >= 2) {
    await prisma.activity.update({
      where: { id },
      data: { status: 'HIDDEN' },
    })
  }

  return NextResponse.json({ success: true })
}
