import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'
import { logAdminAction } from '@/lib/audit-log'
import { getClientIp } from '@/lib/ip-check'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await params

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: { title: true, deletedAt: true },
  })

  if (!activity) {
    return NextResponse.json({ error: '活动不存在' }, { status: 404 })
  }

  if (activity.deletedAt) {
    return NextResponse.json({ error: '活动已被删除' }, { status: 400 })
  }

  await prisma.activity.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await logAdminAction({
    actorId: user.userId,
    action: 'DELETE_ACTIVITY',
    targetType: 'Activity',
    targetId: id,
    details: `删除活动: ${activity.title}`,
    ip: getClientIp(req),
  })

  return NextResponse.json({ success: true })
}
