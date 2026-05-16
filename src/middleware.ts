import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

function getSecret() {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret')
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { clockTolerance: 60 })
    return payload as { userId: string; email: string; role: string }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicPaths = ['/', '/auth', '/api/auth/send-code', '/api/auth/verify-code', '/api/auth/me']
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value
  if (!token) {
    console.log(`[MIDDLEWARE] no token for ${pathname}`)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    console.log(`[MIDDLEWARE] invalid token for ${pathname}`)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-role', payload.role)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
