import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const pending = await prisma.pendingApproval.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ pending })
  } catch {
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}
