import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, nickname: true, email: true } },
      registrations: {
        include: { user: { select: { id: true, nickname: true } } },
      },
      _count: { select: { registrations: true, reports: true } },
    },
  })

  if (!activity) {
    return NextResponse.json({ error: '活动不存在' }, { status: 404 })
  }

  const isCreator = user?.userId === activity.creatorId
  const isAdmin = user?.role === 'ADMIN'
  const hasJoined = user ? activity.registrations.some((r) => r.userId === user.userId) : false

  const eventTime = new Date(activity.eventTime)
  const now = new Date()
  const isEnded = eventTime < now || activity.status === 'ENDED'
  const isWithin24hAfterEnd = isEnded && now.getTime() - eventTime.getTime() < 24 * 60 * 60 * 1000

  let registrations = activity.registrations
  if (!isCreator && !isAdmin) {
    if (isEnded && !isWithin24hAfterEnd) {
      registrations = []
    } else if (!hasJoined) {
      registrations = []
    }
  }

  return NextResponse.json({
    activity: {
      ...activity,
      registrations,
      isCreator,
      isAdmin,
      hasJoined,
      isEnded,
    },
  })
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: { creatorId: true },
  })

  if (!activity) {
    return NextResponse.json({ error: '活动不存在' }, { status: 404 })
  }

  if (activity.creatorId !== user.userId && user.role !== 'ADMIN') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  await prisma.activity.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json({ success: true })
}
