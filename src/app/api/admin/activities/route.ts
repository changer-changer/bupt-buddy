import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const activities = await prisma.activity.findMany({
    include: {
      creator: { select: { email: true, nickname: true } },
      _count: { select: { registrations: true, reports: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ activities })
}
