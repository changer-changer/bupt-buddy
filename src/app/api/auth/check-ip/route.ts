import { NextResponse } from 'next/server'
import { isBuptIp, getClientIp } from '@/lib/ip-check'

export async function GET(req: Request) {
  const ip = getClientIp(req)
  const onCampus = isBuptIp(ip)
  return NextResponse.json({ ip, onCampus })
}
