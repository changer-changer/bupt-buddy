import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    const [pending, total] = await Promise.all([
      prisma.pendingApproval.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pendingApproval.count({ where: { status: 'PENDING' } }),
    ])
    return NextResponse.json({ pending, total, page, pageSize })
  } catch {
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}
