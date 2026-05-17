import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'
import { logAdminAction } from '@/lib/audit-log'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
  const search = searchParams.get('search') || ''

  const where: { deletedAt: null; title?: { contains: string; mode: 'insensitive' } } = {
    deletedAt: null,
  }

  if (search) {
    where.title = { contains: search, mode: 'insensitive' }
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        creator: { select: { email: true, nickname: true } },
        _count: { select: { registrations: true, reports: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activity.count({ where }),
  ])

  return NextResponse.json({ activities, total, page, pageSize })
}
