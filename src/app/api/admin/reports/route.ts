import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const reports = await prisma.report.findMany({
    where: { status: 'PENDING' },
    include: {
      activity: {
        select: { title: true, creatorId: true, status: true },
      },
      reporter: { select: { email: true, nickname: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ reports })
}
