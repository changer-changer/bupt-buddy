'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fallbackMsg, setFallbackMsg] = useState('')
  const router = useRouter()

  const sendCode = async () => {
    setError('')
    setFallbackMsg('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '发送失败')
      } else {
        setStep('code')
        if (data.fallback) {
          setFallbackMsg('邮件服务未配置，请在服务器控制台查看验证码')
        }
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const verify = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '验证失败')
      } else {
        router.push('/')
        router.refresh()
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
          <p className="text-sm text-gray-500 mt-1">仅支持 @bupt.edu.cn 邮箱</p>
        </div>

        {step === 'email' ? (
          <div className="space-y-3">
            <input
              type="email"
              placeholder="yourname@bupt.edu.cn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendCode}
              disabled={loading || !email}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '发送中...' : '发送验证码'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">验证码已发送至 {email}</p>
            <input
              type="text"
              placeholder="6位验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={verify}
              disabled={loading || code.length !== 6}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '验证中...' : '登录 / 注册'}
            </button>
            <button
              onClick={() => setStep('email')}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              返回修改邮箱
            </button>
          </div>
        )}

        {fallbackMsg && (
          <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg">
            {fallbackMsg}
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
