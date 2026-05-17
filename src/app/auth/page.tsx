'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()

  // Common states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [setupKey, setSetupKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [checkingIp, setCheckingIp] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [hasAdmin, setHasAdmin] = useState(true)
  const [error, setError] = useState('')
  const [ipStatus, setIpStatus] = useState<'idle' | 'campus' | 'outside'>('idle')
  const [mode, setMode] = useState<'name' | 'email'>('name')
  const [codeSent, setCodeSent] = useState(false)

  useEffect(() => {
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then((data) => {
        setHasAdmin(data.hasAdmin)
        if (!data.hasAdmin) {
          setMode('email')
        }
        setCheckingAdmin(false)
      })
      .catch(() => setCheckingAdmin(false))
  }, [])

  const checkIp = async () => {
    setCheckingIp(true)
    setError('')
    try {
      const res = await fetch('/api/auth/check-ip')
      const data = await res.json()
      if (data.onCampus) {
        setIpStatus('campus')
      } else {
        setIpStatus('outside')
      }
    } catch {
      setError('IP检测失败，请直接尝试注册')
    } finally {
      setCheckingIp(false)
    }
  }

  const sendCode = async () => {
    setError('')
    if (!email || !email.endsWith('@bupt.cn')) {
      setError('请输入有效的 @bupt.cn 邮箱')
      return
    }
    setSendingCode(true)
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setCodeSent(true)
        if (data.fallback) {
          setError('验证码已生成，请查看控制台或邮件')
        }
      } else {
        setError(data.error || '发送失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setSendingCode(false)
    }
  }

  const verifyAndLogin = async () => {
    setError('')
    if (!email || !code) {
      setError('邮箱和验证码必填')
      return
    }
    if (!hasAdmin && !setupKey.trim()) {
      setError('请输入管理员注册密钥')
      return
    }
    setLoading(true)
    try {
      const body: { email: string; code: string; setupKey?: string } = { email, code }
      if (!hasAdmin) {
        body.setupKey = setupKey.trim()
      }
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const registerName = async () => {
    setError('')
    if (!name || name.trim().length < 2) {
      setError('请输入真实姓名（至少2个字）')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '注册失败')
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
          <p className="text-sm text-gray-500 mt-1">
            {checkingAdmin ? '加载中...' : !hasAdmin ? '系统初始化 — 创建首个管理员' : '校园网一键登录'}
          </p>
        </div>

        {checkingAdmin ? (
          <div className="text-center text-sm text-gray-400 py-4">加载中...</div>
        ) : (
          <>
            {!hasAdmin && (
              <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg text-center">
                当前系统无管理员，请使用邮箱验证方式创建
              </div>
            )}

            {hasAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('name')}
                  className={`flex-1 py-1.5 text-xs rounded-lg ${mode === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  姓名登录
                </button>
                <button
                  onClick={() => setMode('email')}
                  className={`flex-1 py-1.5 text-xs rounded-lg ${mode === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  邮箱登录
                </button>
              </div>
            )}

            <button
              onClick={checkIp}
              disabled={checkingIp}
              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {checkingIp ? '检测中...' : '检测校园网IP'}
            </button>

            {ipStatus === 'campus' && (
              <div className="p-3 bg-green-50 text-green-800 text-xs rounded-lg text-center">
                你在校园网
                {mode === 'name' ? '，输入姓名即可登录' : '，使用邮箱验证码登录'}
              </div>
            )}

            {ipStatus === 'outside' && (
              <div className="p-3 bg-orange-50 text-orange-800 text-xs rounded-lg text-center">
                你当前不在校园网，请连接校园网后重试
              </div>
            )}

            {ipStatus === 'campus' && mode === 'name' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">真实姓名 *</label>
                  <input
                    type="text"
                    placeholder="请输入真实姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={registerName}
                  disabled={loading}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '处理中...' : '登录 / 注册'}
                </button>
              </div>
            )}

            {ipStatus === 'campus' && mode === 'email' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">邮箱 *</label>
                  <input
                    type="email"
                    placeholder="yourname@bupt.cn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendCode}
                    disabled={sendingCode}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                  >
                    {sendingCode ? '发送中...' : codeSent ? '重新发送' : '获取验证码'}
                  </button>
                </div>

                {!hasAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">管理员注册密钥 *</label>
                    <input
                      type="password"
                      placeholder="请联系运维人员获取"
                      value={setupKey}
                      onChange={(e) => setSetupKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <button
                  onClick={verifyAndLogin}
                  disabled={loading}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '处理中...' : !hasAdmin ? '创建管理员' : '登录 / 注册'}
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
