import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/jwt'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
  const search = searchParams.get('search') || ''

  const where: { deletedAt: null; OR?: Array<{ email?: { contains: string; mode: 'insensitive' }; nickname?: { contains: string; mode: 'insensitive' } }> } = {
    deletedAt: null,
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { nickname: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          nickname: true,
          role: true,
          createdAt: true,
          _count: { select: { activities: true, registrations: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])
    return NextResponse.json({ users, total, page, pageSize })
  } catch {
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}
