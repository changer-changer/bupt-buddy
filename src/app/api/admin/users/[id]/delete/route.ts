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

  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID 必填' }, { status: 400 })
    }

    // Prevent self-deletion
    if (id === user.userId) {
      return NextResponse.json({ error: '不能删除自己' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true, nickname: true, role: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    if (targetUser.role === 'ADMIN') {
      return NextResponse.json({ error: '不能删除其他管理员' }, { status: 403 })
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await logAdminAction({
      actorId: user.userId,
      action: 'DELETE_USER',
      targetType: 'User',
      targetId: id,
      details: `删除用户: ${targetUser.nickname || targetUser.email}`,
      ip: getClientIp(req),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
