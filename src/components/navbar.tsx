'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  nickname: string | null
  role: string
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user)
      })
      .catch(() => {})
  }, [])

  const logout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    setUser(null)
    router.push('/auth')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="font-bold text-gray-900">
          北邮搭伙
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-gray-600">{user.nickname || user.email.split('@')[0]}</span>
              {user.role === 'ADMIN' && (
                <Link href="/admin" className="text-blue-600">
                  管理
                </Link>
              )}
              <button onClick={logout} className="text-gray-500 hover:text-gray-700">
                退出
              </button>
            </>
          ) : (
            <Link href="/auth" className="text-blue-600">
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
