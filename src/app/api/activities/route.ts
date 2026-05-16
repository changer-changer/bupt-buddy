import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  meetupPoint: z.string().min(1).max(200),
  eventTime: z.string().datetime(),
  maxParticipants: z.number().int().min(2).max(50),
  description: z.string().max(500).optional(),
})

export async function GET() {
  const now = new Date()

  const activities = await prisma.activity.findMany({
    where: {
      status: { in: ['ACTIVE', 'FULL'] },
      eventTime: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
    },
    include: {
      creator: { select: { nickname: true, email: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ activities })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentCount = await prisma.activity.count({
      where: {
        creatorId: user.userId,
        createdAt: { gte: twentyFourHoursAgo },
      },
    })

    if (recentCount >= 3) {
      return NextResponse.json({ error: '24小时内最多发3条活动' }, { status: 429 })
    }

    const activity = await prisma.activity.create({
      data: {
        creatorId: user.userId,
        title: data.title,
        location: data.location,
        meetupPoint: data.meetupPoint,
        eventTime: new Date(data.eventTime),
        maxParticipants: data.maxParticipants,
        description: data.description,
      },
    })

    return NextResponse.json({ activity })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '数据格式错误' }, { status: 400 })
    }
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
