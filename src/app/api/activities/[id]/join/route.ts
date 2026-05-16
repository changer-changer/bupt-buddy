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

  const { contactWechat, contactPhone } = await req.json()

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: { registrations: true },
  })

  if (!activity) {
    return NextResponse.json({ error: '活动不存在' }, { status: 404 })
  }

  if (activity.creatorId === user.userId) {
    return NextResponse.json({ error: '不能报名自己的活动' }, { status: 400 })
  }

  if (activity.status !== 'ACTIVE') {
    return NextResponse.json({ error: '活动已结束或已满' }, { status: 400 })
  }

  if (activity.registrations.length >= activity.maxParticipants) {
    return NextResponse.json({ error: '名额已满' }, { status: 400 })
  }

  const existing = await prisma.registration.findUnique({
    where: { activityId_userId: { activityId: id, userId: user.userId } },
  })

  if (existing) {
    return NextResponse.json({ error: '已报名' }, { status: 400 })
  }

  const registration = await prisma.registration.create({
    data: {
      activityId: id,
      userId: user.userId,
      contactWechat: contactWechat || null,
      contactPhone: contactPhone || null,
    },
  })

  const count = await prisma.registration.count({ where: { activityId: id } })
  if (count >= activity.maxParticipants) {
    await prisma.activity.update({
      where: { id },
      data: { status: 'FULL' },
    })
  }

  return NextResponse.json({ registration })
}
