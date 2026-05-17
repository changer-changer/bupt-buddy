'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingIp, setCheckingIp] = useState(false)
  const [error, setError] = useState('')
  const [pendingMsg, setPendingMsg] = useState('')
  const [ipStatus, setIpStatus] = useState<'idle' | 'campus' | 'outside'>('idle')
  const router = useRouter()

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

  const register = async () => {
    setError('')
    setPendingMsg('')

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
          <p className="text-sm text-gray-500 mt-1">校园网一键登录</p>
        </div>

        <button
          onClick={checkIp}
          disabled={checkingIp}
          className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {checkingIp ? '检测中...' : '检测校园网IP'}
        </button>

        {ipStatus === 'campus' && (
          <div className="p-3 bg-green-50 text-green-800 text-xs rounded-lg text-center">
            你在校园网，输入姓名即可直接登录
          </div>
        )}

        {ipStatus === 'outside' && (
          <div className="p-3 bg-orange-50 text-orange-800 text-xs rounded-lg text-center">
            你当前不在校园网，无法使用一键登录，请连接校园网后重试
          </div>
        )}

        {ipStatus === 'campus' && (
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
              onClick={register}
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : '登录 / 注册'}
            </button>
          </div>
        )}

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
