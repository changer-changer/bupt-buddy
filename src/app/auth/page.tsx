'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingMsg, setPendingMsg] = useState('')
  const router = useRouter()

  const register = async () => {
    setError('')
    setPendingMsg('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, studentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '注册失败')
      } else if (data.onCampus) {
        router.push('/')
        router.refresh()
      } else {
        setPendingMsg(data.message || '已提交审核，请等待管理员通过')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">北邮搭伙平台</h1>
          <p className="text-sm text-gray-500 mt-1">仅支持 @bupt.cn 邮箱</p>
          <p className="text-xs text-gray-400 mt-1">校园网自动通过，校外需审核</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="yourname@bupt.cn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="姓名（可选）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="学号（校外必填）"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={register}
            disabled={loading || !email}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '处理中...' : '注册 / 登录'}
          </button>
        </div>

        {pendingMsg && (
          <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg">
            {pendingMsg}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
