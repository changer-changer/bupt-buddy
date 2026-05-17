import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN', deletedAt: null } })
  return NextResponse.json({ hasAdmin: !!adminExists })
}
